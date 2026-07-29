import { expect, test, type Page } from '@playwright/test'

const password = process.env.DEMO_PASSWORD ?? 'RoastGridDemo2026!'

async function signIn(page: Page) {
  await page.goto('/en/sign-in')
  await page.getByLabel('Email').fill('cashier@roastgrid.app')
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

test.use({ viewport: { width: 390, height: 844 } })

test('mobile shell exposes bottom navigation and a full-screen order drawer', async ({ page }) => {
  await signIn(page)
  await expect(page.locator('aside')).toBeHidden()
  await expect(page.getByRole('link', { name: 'POS' }).last()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shifts' }).last()).toBeVisible()

  await page.goto('/en/pos')
  await expect(page.getByRole('heading', { name: 'Point of Sale' }).first()).toBeVisible()

  const orderButton = page.locator('button').filter({ hasText: 'Point of Sale' }).last()
  await expect(orderButton).toBeVisible()
  await orderButton.click()

  const orderDialog = page.getByRole('dialog', { name: 'Point of Sale' })
  await expect(orderDialog).toBeVisible()
  await expect(orderDialog.getByRole('button', { name: 'Close' })).toBeVisible()
})

test('resource grid opens the exact occupied order owned by the cashier', async ({ page }) => {
  await signIn(page)
  await page.goto('/en/resources')
  await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible()

  const currentOrder = page.getByRole('button', { name: 'current order' }).first()
  await expect(currentOrder).toBeVisible()
  await currentOrder.click()

  await expect(page).toHaveURL(/\/en\/pos\?orderId=80000000-0000-4000-8000-000000000002$/)
  await expect(page.getByRole('heading', { name: 'Point of Sale' }).first()).toBeVisible()
  await expect(page.getByText('Cappuccino').first()).toBeVisible()
})
