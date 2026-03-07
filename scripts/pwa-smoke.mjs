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

async function main() {
  await mkdir(outputDir, { recursive: true })

  const previewLog = []
  const browserConsole = []

  const preview = spawn(
    process.platform === 'win32' ? 'cmd.exe' : 'pnpm',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', `pnpm preview --host ${host} --port ${port}`]
      : ['preview', '--host', host, '--port', String(port)],
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

    page.on('console', (message) => {
      browserConsole.push(`[${message.type()}] ${message.text()}`)
    })

    await page.goto(`${baseUrl}/decks/demo-deck`, { waitUntil: 'networkidle' })
    await page.getByText('Deck workspace reserved').waitFor()
    await page.screenshot({ path: join(outputDir, 'online-deck-route.png') })

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

    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller))

    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Deck workspace reserved' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'offline-deck-route.png') })

    await context.setOffline(false)
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
