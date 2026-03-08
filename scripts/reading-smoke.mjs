import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outputDir = resolve(projectRoot, 'output', 'playwright', 'reading-smoke')
const host = '127.0.0.1'
const port = Number(process.env.READING_SMOKE_PORT || 4174)
const baseUrl = `http://${host}:${port}`
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

    const longReadingText = Array.from({ length: 36 }, (_, index) => {
      return `Paragraph ${index + 1}. Ranki should keep this pasted reading text available offline and remember a calm local resume point after the reader scrolls.`
    }).join('\n\n')

    console.log('Opening reading library')
    await page.goto(`${baseUrl}/reading`, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'No reading items yet.' }).waitFor()

    console.log('Creating reading item')
    await page.getByLabel('Title').fill('Reading foundation note')
    await page.getByLabel('Reading text').fill(longReadingText)
    await page.getByRole('button', { name: 'Save and open' }).click()

    await page.getByRole('heading', { name: 'Reading foundation note' }).waitFor()
    await page.screenshot({ path: join(outputDir, 'reading-view.png') })

    console.log('Saving scroll progress')
    const reader = page.getByLabel('Reading document content')
    await reader.evaluate((element) => {
      const container = element
      const maxScrollTop = container.scrollHeight - container.clientHeight
      container.scrollTop = maxScrollTop * 0.5
      container.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    await page.waitForTimeout(450)
    console.log('Returning to reading library')
    await page.getByRole('link', { name: 'Back to reading library' }).click()
    await page.getByRole('heading', { name: 'Reading Library' }).waitFor()
    await page.getByText('Resume 50%').waitFor()
    await page.screenshot({ path: join(outputDir, 'reading-library.png') })

    console.log('Reopening reader to verify resume state')
    await page.getByRole('link', { name: 'Open Reading foundation note' }).click()
    await page.getByRole('heading', { name: 'Reading foundation note' }).waitFor()
    await page.waitForTimeout(250)

    const resumedScrollTop = await reader.evaluate((element) => {
      return element.scrollTop
    })

    if (resumedScrollTop <= 0) {
      throw new Error('Expected reading resume scroll position to be restored.')
    }

    await browser.close()
    await writeFile(previewLogPath, previewLog.join(''), 'utf8')
    await writeFile(consoleLogPath, browserConsole.join('\n'), 'utf8')

    console.log(`Reading smoke passed. Artifacts written to ${outputDir}`)
  } finally {
    await terminatePreview(preview)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
