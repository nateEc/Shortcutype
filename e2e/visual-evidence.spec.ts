import { expect, test, type Page } from '@playwright/test'

const settings = {
  version: 2, platform: 'mac', mode: 'specialty', category: 'editor', specialty: 'emacs',
  duration: 60, count: 10, theme: 'dark', locale: 'en', learning: 'learn',
  includeSystemCards: false, motion: false, sound: false,
}

test('captures verified desktop, error, results, and mobile states', async ({ page }) => {
  await page.addInitScript((storedSettings) => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify(storedSettings))
    localStorage.setItem('shortcutype-onboarding-v1', JSON.stringify({
      version: 1, status: 'completed', stage: 'tools', selectedTools: ['emacs'], completedAt: 1,
    }))
  }, settings)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'What do you want to practice?' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/evidence/ready-desktop.png', fullPage: true })

  await page.keyboard.press('Enter')
  const target = await readVisibleShortcut(page)
  await page.keyboard.press(toPlaywrightKey(target[0].at(-1)!))
  await expect(page.getByText('The main key is right. Adjust the modifiers.')).toBeVisible()
  await page.screenshot({ path: 'artifacts/evidence/practice-error.png', fullPage: true })
  await pressShortcut(page, target)
  await expect(page.getByText('1 / 10', { exact: true })).toBeVisible()

  for (let answer = 1; answer < 10; answer += 1) {
    await pressVisibleShortcut(page)
    if (answer < 9) await expect(page.getByText(`${answer + 1} / 10`, { exact: true })).toBeVisible()
  }
  await expect(page.getByText('Practice complete')).toBeVisible()
  await page.screenshot({ path: 'artifacts/evidence/results.png', fullPage: true })

  await page.getByRole('button', { name: 'shortcutype' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'What do you want to practice?' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/evidence/ready-mobile.png', fullPage: true })
})

test('captures the first-run explanation', async ({ page }) => {
  await page.addInitScript((storedSettings) => {
    localStorage.clear()
    localStorage.setItem('shortcutype-settings-v2', JSON.stringify(storedSettings))
  }, { ...settings, learning: 'recall' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'See an action. Press its shortcut.' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/evidence/onboarding-intro.png', fullPage: true })
})

async function pressVisibleShortcut(page: Page) {
  await pressShortcut(page, await readVisibleShortcut(page))
}

async function readVisibleShortcut(page: Page) {
  const steps = page.locator('.chord-trace .trace-step')
  const count = await steps.count()
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
