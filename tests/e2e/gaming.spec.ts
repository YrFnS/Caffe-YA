import { expect, test } from '@playwright/test'

test.skip(process.env.RUN_MUTATING_E2E !== '1', 'requires an isolated seeded database branch')

test('café order follows a gaming timer across a station transfer', async ({ page }) => {
  await page.goto('/en/sign-in')
  await page.getByLabel('Email').fill('cashier@roastgrid.app')
  await page.getByLabel('Password').fill(process.env.DEMO_PASSWORD ?? 'RoastGridDemo2026!')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(/\/en\/dashboard/)

  await page.goto('/en/pos')
  await page.getByRole('button', { name: 'Cappuccino Cappuccino 6,500 IQD' }).click()
  await expect(page.getByRole('button', { name: 'Clear order' })).toBeEnabled()

  await page.getByRole('button', { name: 'Select a table or station' }).click()
  await expect(page.getByRole('button', { name: '5,000/hr PS5 Lounge 01 Occupied' })).toBeDisabled()
  await page.getByRole('button', { name: '5,000/hr Gaming PC 01 Available' }).click()
  await expect(page.getByRole('button', { name: 'Stop timer' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled()

  await page.getByRole('button', { name: 'Select a table or station' }).click()
  await page.getByRole('button', { name: '5,000/hr VIP Booth Available' }).click()
  await expect(page.getByText('2,500 IQD', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Stop timer' }).click()
  await expect(page.getByText('5,000 IQD', { exact: true })).toBeVisible()
  await expect(page.getByText('11,500 IQD', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Stop timer' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeEnabled()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'Confirm Payment' }).click()

  await expect(page.getByRole('heading', { name: 'No items in order' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Select a table or station' }).click()
  await expect(page.getByRole('button', { name: '5,000/hr Gaming PC 01 Available' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '5,000/hr VIP Booth Available' })).toBeEnabled()
})
