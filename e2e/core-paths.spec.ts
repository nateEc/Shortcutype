import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const settings = {
  version: 2, platform: 'mac', mode: 'specialty', category: 'editor', specialty: 'vim',
  duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'learn',
  includeSystemCards: false, motion: false, sound: false,
}

const completedOnboarding = {
  version: 1, status: 'completed', stage: 'tools', selectedTools: ['vim'], completedAt: 1,
}

test('new user completes Teach → Imitate → Recall and starts personalized practice', async ({ page }) => {
  await seedSettings(page, { ...settings, specialty: 'vscode', learning: 'recall' })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'See an action. Press its shortcut.' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Start with the answer visible')).toBeVisible()

  await page.keyboard.press('Meta+C')
  await expect(page.getByText('Now follow the pattern')).toBeVisible()
  await page.keyboard.press('Meta+F')
  await expect(page.getByText('Now do it from memory')).toBeVisible()
  await expect(page.locator('.recall-cue')).toBeVisible()
  await page.keyboard.press('Meta+C')

  await expect(page.getByRole('heading', { name: 'Where do you work most?' })).toBeVisible()
  await page.getByRole('button', { name: /VS Code/ }).click()
  await page.getByRole('button', { name: /Build my practice/ }).click()
  await expect(page.locator('.app')).toHaveClass(/phase-running/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const onboarding = await page.evaluate(() => JSON.parse(localStorage.getItem('shortcutype-onboarding-v1') ?? '{}'))
  expect(onboarding).toMatchObject({ status: 'completed', selectedTools: ['vscode'] })
})

test('returning user completes a full practice session and reaches results', async ({ page }) => {
  await seedReturningUser(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What do you want to practice?' })).toBeVisible()
  await page.keyboard.press('Enter')

  for (let answer = 0; answer < 10; answer += 1) {
    await pressVisibleShortcut(page)
    if (answer < 9) await expect(page.getByText(`${answer + 1} / 10`, { exact: true })).toBeVisible()
  }

  await expect(page.getByText('Practice complete')).toBeVisible()
  await expect(page.locator('.app')).toHaveClass(/phase-finished/)
  await expect(page.getByRole('button', { name: /Practice again/ })).toBeEnabled()
  await expect(page.locator('.review-row')).toHaveCount(10)
})

test('settings and library expose accessible state, empty results, and focus recovery', async ({ page }) => {
  await seedReturningUser(page)
  await page.goto('/')

  const setup = page.getByRole('button', { name: 'Practice setup' })
  await setup.focus()
  await setup.click()
  await expect(page.getByRole('dialog', { name: 'Practice setup' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'macOS' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('main')).toHaveAttribute('aria-hidden', 'true')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(setup).toBeFocused()

  await page.getByRole('button', { name: 'Shortcut library' }).click()
  const library = page.getByRole('dialog', { name: 'Shortcut library' })
  await library.getByRole('textbox', { name: 'Search commands…' }).fill('not-a-real-shortcut')
  await expect(library.getByRole('status')).toHaveText('No shortcuts match this search.')

  const results = await new AxeBuilder({ page }).include('.drawer').analyze()
  expect(results.violations).toEqual([])
})

test('390px ready page has no horizontal overflow and keeps the library reachable', async ({ page }) => {
  await seedReturningUser(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Shortcut library' })).toBeVisible()
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(metrics.content).toBeLessThanOrEqual(metrics.viewport)
  const results = await new AxeBuilder({ page }).include('main').analyze()
  expect(results.violations).toEqual([])
})

test('practice exposes modifier errors, assisted answers, and a resumable command palette', async ({ page }) => {
  await seedReturningUser(page, { ...settings, specialty: 'emacs', learning: 'learn' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What do you want to practice?' })).toBeVisible()
  await page.keyboard.press('Enter')

  const target = await readVisibleShortcut(page)
  expect(target[0].length).toBeGreaterThan(1)
  await page.keyboard.press(toPlaywrightKey(target[0].at(-1)!))
  await expect(page.getByText('The main key is right. Adjust the modifiers.')).toBeVisible()
  await expect(page.locator('.chord-trace .trace-label')).toHaveText('Your input')
  await expect(page.locator('.chord-trace kbd')).toHaveCount(1)
  await pressShortcut(page, target)
  await expect(page.getByText('1 / 10', { exact: true })).toBeVisible()

  await page.keyboard.press('F1')
  await expect(page.getByText('Answer revealed — unscored')).toBeVisible()
  await pressVisibleShortcut(page)
  await expect(page.getByText('2 / 10', { exact: true })).toBeVisible()

  await page.keyboard.press('Control+Shift+P')
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible()
  await expect(page.locator('.app')).toHaveClass(/phase-paused/)
  await page.keyboard.press('Escape')
  await expect(page.locator('.app')).toHaveClass(/phase-running/)
})

test('denied local storage shows a recoverable error instead of crashing', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('denied') }
  })
  await page.goto('/')

  await expect(page.getByRole('alert')).toContainText("progress won't be saved")
  await expect(page.getByRole('heading', { name: 'See an action. Press its shortcut.' })).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

async function seedSettings(page: Page, value: typeof settings) {
  await page.addInitScript((stored) => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify(stored))
  }, value)
}

async function seedReturningUser(page: Page, storedSettings = settings) {
  await page.addInitScript(({ storedSettings, onboarding }) => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify(storedSettings))
    localStorage.setItem('shortcutype-onboarding-v1', JSON.stringify(onboarding))
  }, { storedSettings, onboarding: completedOnboarding })
}

async function pressVisibleShortcut(page: Page) {
  await pressShortcut(page, await readVisibleShortcut(page))
}

async function readVisibleShortcut(page: Page) {
  const steps = page.locator('.chord-trace .trace-step')
  const count = await steps.count()
  expect(count).toBeGreaterThan(0)
  const shortcut: string[][] = []
  for (let index = 0; index < count; index += 1) {
    shortcut.push(await steps.nth(index).locator('kbd').allTextContents())
  }
  return shortcut
}

async function pressShortcut(page: Page, shortcut: string[][]) {
  for (const labels of shortcut) await page.keyboard.press(labels.map(toPlaywrightKey).join('+'))
}

function toPlaywrightKey(label: string) {
  const keys: Record<string, string> = {
    Cmd: 'Meta', Ctrl: 'Control', Control: 'Control', Option: 'Alt', Win: 'Meta',
    Esc: 'Escape', 'Left Arrow': 'ArrowLeft', 'Right Arrow': 'ArrowRight',
    'Up Arrow': 'ArrowUp', 'Down Arrow': 'ArrowDown', Space: 'Space',
  }
  return keys[label] ?? label
}
