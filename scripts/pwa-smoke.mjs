import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outputDir = resolve(projectRoot, 'output', 'playwright', 'pwa-smoke')
const host = '127.0.0.1'
const port = Number(process.env.PWA_SMOKE_PORT || 4173)
const baseUrl = `http://${host}:${port}`
const headed = process.argv.includes('--headed')
const previewLogPath = join(outputDir, 'preview.log')
const consoleLogPath = join(outputDir, 'browser-console.log')

async function waitForPreview(url, timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until preview is ready.
    }

    await delay(500)
  }

  throw new Error(`Timed out waiting for preview at ${url}`)
}

async function terminatePreview(preview) {
  if (!preview.pid) {
    return
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn(
        'cmd.exe',
        ['/d', '/s', '/c', `taskkill /PID ${preview.pid} /T /F`],
        {
          stdio: 'ignore',
          windowsHide: true,
        },
      )

      killer.on('error', () => resolve(undefined))
      killer.on('exit', () => resolve(undefined))
    })

    return
  }

  preview.kill('SIGTERM')
  await delay(1_000)

  if (!preview.killed) {
    preview.kill('SIGKILL')
  }
}

async function waitForServiceWorker(page) {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    try {
      await navigator.serviceWorker.ready
      return true
    } catch {
      return false
    }
  })

  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller))
}

async function waitForMetricValue(page, label, value) {
  const metricTile = page.getByText(label, { exact: true }).locator('xpath=..')
  await metricTile.getByText(value, { exact: true }).waitFor()
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const previewLog = []
  const browserConsole = []

  const preview = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'pnpm',
    process.platform === 'win32'
      ? [
          '/d',
          '/s',
          '/c',
          `pnpm preview --host ${host} --port ${port} --strictPort`,
        ]
      : ['preview', '--host', host, '--port', String(port), '--strictPort'],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )

  preview.stdout?.on('data', (chunk) => {
    previewLog.push(chunk.toString())
  })
  preview.stderr?.on('data', (chunk) => {
    previewLog.push(chunk.toString())
  })

  try {
    await waitForPreview(baseUrl)

    const browser = await chromium.launch({ headless: !headed })
    const context = await browser.newContext()
    const page = await context.newPage()
    page.setDefaultTimeout(10_000)

    page.on('console', (message) => {
      browserConsole.push(`[${message.type()}] ${message.text()}`)
    })

    console.log('Opening decks home')
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'No decks yet on this device.' }).waitFor()

    console.log('Creating deck')
    await page.getByRole('link', { name: 'Create your first deck' }).click()
    await page.getByLabel('Deck name').fill('English')
    await page.getByLabel('Description').fill('Core vocabulary')
    await page.getByRole('button', { name: 'Create deck' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'deck-home-online.png') })

    console.log('Opening deck workspace')
    await page.getByRole('link', { name: 'Open English' }).click()
    await page.getByRole('heading', { name: 'No cards in this deck yet.' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'deck-details-online.png') })

    console.log('Creating first card')
    await page.getByRole('link', { name: 'Add first card' }).click()
    await page.getByLabel('Front text').fill('obscure')
    await page.getByLabel('Back text').fill('hidden or difficult to understand')
    await page.getByRole('button', { name: 'Create card' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()
    await waitForMetricValue(page, 'Cards stored', '1')
    await page.getByRole('link', { name: 'Edit obscure' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'deck-details-with-card.png') })

    console.log('Reloading deck workspace to verify the card persists')
    await page.reload({ waitUntil: 'networkidle' })
    await waitForMetricValue(page, 'Cards stored', '1')
    await page.getByRole('link', { name: 'Edit obscure' }).waitFor()

    console.log('Waiting for PWA service worker')
    await waitForServiceWorker(page)

    console.log('Running core flashcards study flow')
    await page.getByRole('link', { name: 'Start study' }).click()
    await page.getByRole('heading', { name: 'obscure' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'study-session-online.png') })

    await page.getByRole('button', { name: 'Show answer' }).click()
    await page.getByText('hidden or difficult to understand').waitFor()
    await page.getByRole('button', { name: 'Good' }).click()
    await page.getByRole('heading', { name: 'Study queue complete for now' }).waitFor()
    await page.getByRole('heading', { name: 'Last rating result' }).waitFor()
    await page.getByText('Saved locally', { exact: true }).waitFor()
    await page.screenshot({ path: join(outputDir, 'study-session-complete.png') })

    console.log('Reloading study route to verify the saved result survives refresh')
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'Study queue complete for now' }).waitFor()
    await page.getByRole('button', { name: 'Refresh queue' }).waitFor()

    await page.getByRole('link', { name: 'Back to deck' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()
    await waitForMetricValue(page, 'Reviews today', '1')
    await waitForMetricValue(page, 'Cards stored', '1')
    await page.getByRole('link', { name: 'Edit obscure' }).waitFor()

    console.log('Reloading deck workspace offline')
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'English' }).waitFor()
    await waitForMetricValue(page, 'Reviews today', '1')
    await waitForMetricValue(page, 'Cards stored', '1')
    await page.getByRole('link', { name: 'Edit obscure' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'deck-details-offline.png') })

    await context.setOffline(false)

    console.log('Editing and deleting deck to preserve existing CRUD coverage')
    await page.getByRole('link', { name: 'Edit deck' }).click()
    await page.getByLabel('Deck name').fill('English Updated')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.getByRole('heading', { name: 'English Updated' }).waitFor()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete English Updated' }).click()
    await page.getByRole('heading', { name: 'No decks yet on this device.' }).waitFor()

    await browser.close()

    await writeFile(previewLogPath, previewLog.join(''), 'utf8')
    await writeFile(consoleLogPath, browserConsole.join('\n'), 'utf8')

    console.log(`PWA smoke passed. Artifacts written to ${outputDir}`)
  } finally {
    await terminatePreview(preview)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
