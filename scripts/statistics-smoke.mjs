import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outputDir = resolve(projectRoot, 'output', 'playwright', 'statistics-smoke')
const host = '127.0.0.1'
const port = Number(process.env.STATISTICS_SMOKE_PORT || 4178)
const baseUrl = `http://${host}:${port}`
const previewLogPath = join(outputDir, 'preview.log')
const consoleLogPath = join(outputDir, 'browser-console.log')

async function fetchWithTimeout(url, timeoutMs = 1_000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function waitForPreview(url, timeoutMs = 30_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchWithTimeout(url)
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
    await new Promise((resolvePromise) => {
      const killer = spawn(
        'cmd.exe',
        ['/d', '/s', '/c', `taskkill /PID ${preview.pid} /T /F`],
        {
          stdio: 'ignore',
          windowsHide: true,
        },
      )

      killer.on('error', () => resolvePromise(undefined))
      killer.on('exit', () => resolvePromise(undefined))
    })

    return
  }

  preview.kill('SIGTERM')
  await delay(1_000)

  if (!preview.killed) {
    preview.kill('SIGKILL')
  }
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

    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()
    page.setDefaultTimeout(10_000)

    page.on('console', (message) => {
      browserConsole.push(`[${message.type()}] ${message.text()}`)
    })

    console.log('Creating deck and cards')
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'No decks yet on this device.' }).waitFor()

    await page.getByRole('link', { name: 'Create your first deck' }).click()
    await page.getByLabel('Deck name').fill('English')
    await page.getByLabel('Description').fill('Statistics smoke deck')
    await page.getByRole('button', { name: 'Create deck' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()
    await page.getByRole('link', { name: 'Open English' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()

    await page.getByRole('link', { name: 'Add card' }).first().click()
    await page.getByLabel('Front text').fill('alpha')
    await page.getByLabel('Back text').fill('first answer')
    await page.getByRole('button', { name: 'Create card' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()

    await page.getByRole('link', { name: 'Add card' }).first().click()
    await page.getByLabel('Front text').fill('beta')
    await page.getByLabel('Back text').fill('second answer')
    await page.getByRole('button', { name: 'Create card' }).click()
    await page.getByRole('heading', { name: 'English' }).waitFor()

    console.log('Generating real review history')
    await page.getByRole('link', { name: 'Start study' }).click()
    await page.getByRole('heading', { name: 'alpha' }).waitFor()

    await page.getByRole('button', { name: 'Show answer' }).click()
    await page.getByRole('button', { name: 'Good' }).click()
    await page.getByRole('heading', { name: 'beta' }).waitFor()

    await page.getByRole('button', { name: 'Show answer' }).click()
    await page.getByRole('button', { name: 'Again' }).click()
    await page.getByRole('heading', { name: 'Study queue complete for now' }).waitFor()

    console.log('Opening statistics page')
    await page.getByRole('link', { name: 'Statistics' }).click()
    await page.getByRole('heading', { name: 'Statistics' }).waitFor()

    await page.getByLabel('Reviews today: 2').waitFor()
    await page.getByLabel('Cards studied today: 2').waitFor()
    await page.getByLabel('Reviews in last 7 days: 2').waitFor()
    await page.getByLabel('Again ratings: 1').waitFor()
    await page.getByLabel('Good ratings: 1').waitFor()
    await page.getByLabel('English: 2 reviews').waitFor()

    await page.screenshot({ path: join(outputDir, 'statistics-page.png') })

    await browser.close()
    await writeFile(previewLogPath, previewLog.join(''), 'utf8')
    await writeFile(consoleLogPath, browserConsole.join('\n'), 'utf8')

    console.log(`Statistics smoke passed. Artifacts written to ${outputDir}`)
  } finally {
    await terminatePreview(preview)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
