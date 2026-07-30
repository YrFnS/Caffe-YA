import { expect, test, type Page } from '@playwright/test'

const password = process.env.DEMO_PASSWORD ?? 'RoastGridDemo2026!'

test.describe.configure({ mode: 'serial' })

async function signIn(page: Page, email: string) {
  await page.goto('/en/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  try {
    await page.waitForURL(/\/en\/dashboard/, { timeout: 15_000 })
  } catch (error) {
    const rateLimited = await page.getByText(/Too many requests/i).isVisible()
    if (!rateLimited) throw error
    await page.waitForTimeout(11_000)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL(/\/en\/dashboard/)
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test('operational reports expose complete financial metrics on a phone-sized viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'admin@roastgrid.app')
  await page.goto('/en/reports?from=2026-07-01&to=2026-07-31')

  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await expect(page.getByText('Cost of goods sold')).toBeVisible()
  await expect(page.getByText('Gross profit')).toBeVisible()
  await expect(page.getByText('Average order value')).toBeVisible()
  await expect(page.getByText(/Reports use Baghdad time/)).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Application error')
  await expectNoHorizontalOverflow(page)
})

test('product editor provides image and recipe controls with contained keyboard focus', async ({ page }) => {
  await signIn(page, 'admin@roastgrid.app')
  await page.goto('/en/inventory/products?modal=add')

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByLabel('Type').selectOption('recipe')
  await expect(page.getByText('Recipe ingredients')).toBeVisible()
  await expect(page.getByLabel('Product image URL or path')).toBeVisible()

  await page.getByRole('button', { name: /Add Ingredient/i }).click()
  await expect(page.getByLabel('Select ingredient').first()).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('procurement creates unpaid purchases and remains usable on tablet layouts', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await signIn(page, 'manager@roastgrid.app')
  await page.goto('/en/procurement/purchases')

  await expect(page.getByRole('heading', { name: 'Purchases' })).toBeVisible()
  await page.getByRole('button', { name: 'New Purchase' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByText(/Purchases are created unpaid/)).toBeVisible()
  await expect(dialog.getByRole('checkbox')).toHaveCount(0)
  await expectNoHorizontalOverflow(page)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('Arabic reports and product catalog use document-level RTL and localized content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'admin@roastgrid.app')
  await page.goto('/ar/reports?from=2026-07-01&to=2026-07-31')

  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByText('تكلفة البضاعة المباعة')).toBeVisible()
  await expect(page.getByText('إجمالي الربح')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.goto('/ar/inventory/products')
  await expect(page.locator('article').getByText('إسبريسو مزدوج', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
