import { expect, test, type Page } from '@playwright/test'

const password = process.env.DEMO_PASSWORD ?? 'CaffeDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/en/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  try {
    await page.waitForURL(/\/en\/dashboard/, { timeout: 12_000 })
  } catch (error) {
    const rateLimited = await page.getByText(/Too many requests/i).isVisible()
    if (!rateLimited) throw error
    await page.waitForTimeout(11_000)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL(/\/en\/dashboard/)
  }
}

test('financial APIs reject unauthenticated requests', async ({ request }) => {
  expect((await request.get('/api/accounting/reports/pl?periodStart=2026-01-01&periodEnd=2026-12-31')).status()).toBe(401)
  expect((await request.get('/api/accounting/reports/balance-sheet?asOfDate=2026-07-22')).status()).toBe(401)
})

for (const role of [
  { email: 'admin@caffe.ya', page: '/en/admin/roles', heading: 'Roles', visible: ['Admin', 'Reports'] },
  { email: 'manager@caffe.ya', page: '/en/procurement/purchases', heading: 'Purchases', visible: ['Procurement', 'Reports'] },
  { email: 'cashier@caffe.ya', page: '/en/pos', heading: 'Point of Sale', visible: ['POS', 'Shifts'] },
  { email: 'accountant@caffe.ya', page: '/en/accounting/accounts', heading: 'Accounting', visible: ['Accounting', 'Payroll'] },
]) {
  test(`${role.email} signs in and sees its primary workflow`, async ({ page }) => {
    await signIn(page, role.email)
    await page.goto(role.page)
    await expect(page.getByRole('heading', { name: role.heading }).first()).toBeVisible()
    for (const label of role.visible) await expect(page.getByRole('link', { name: label }).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Application error')
  })
}

test('cashier cannot open admin and does not see finance/admin navigation', async ({ page }) => {
  await signIn(page, 'cashier@caffe.ya')
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Accounting' })).toHaveCount(0)
  await page.goto('/en/admin/users')
  await expect(page).toHaveURL(/\/en\/dashboard$/)
  await page.goto('/en/procurement/purchases')
  await expect(page).toHaveURL(/\/en\/dashboard$/)
})

test('Arabic mode renders an RTL protected shell', async ({ page }) => {
  await signIn(page, 'accountant@caffe.ya')
  await page.goto('/ar/accounting/accounts')
  await expect(page.locator('[dir="rtl"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'المحاسبة' })).toBeVisible()
})
