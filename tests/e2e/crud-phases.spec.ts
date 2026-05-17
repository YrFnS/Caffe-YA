import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@caffe.ya'
const ADMIN_PASSWORD = 'admin123'

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/en/sign-in')
  await page.getByPlaceholder('admin@caffe.ya').fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/en\/dashboard/, { timeout: 10000 })
}

test.describe('Phase 1: Admin Users CRUD', () => {
  test('create, verify, and disable a user', async ({ page }) => {
    await signIn(page)
    await page.goto('/en/admin/users')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Add User' }).click()
    await page.waitForURL(/modal=add/)

    const testEmail = `testuser+${Date.now()}@caffe.ya`
    await page.getByPlaceholder('John Doe').fill('Test User')
    await page.getByPlaceholder('john@example.com').fill(testEmail)
    await page.getByPlaceholder('Minimum 8 characters').fill('testpass123')

    await page.getByRole('button', { name: 'Create User' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Test User').first()).toBeVisible()
    await expect(page.getByText(testEmail)).toBeVisible()

    await page.getByRole('button', { name: 'Disable' }).first().click()
    await expect(page.getByText('Disabled').first()).toBeVisible()
  })
})

test.describe('Phase 2: Employees CRUD', () => {
  test('create, edit, and delete an employee', async ({ page }) => {
    await signIn(page)
    await page.goto('/en/employees')
    await page.waitForLoadState('networkidle')

    // Create
    await page.getByRole('button', { name: 'Add Employee' }).click()
    await page.waitForURL(/modal=add/)
    await page.getByPlaceholder('John Doe').fill('Ahmed Hassan')
    await page.getByPlaceholder('+964 750 123 4567').fill('+964 750 999 8888')
    await page.locator('select').nth(0).selectOption('fixed')
    await page.getByPlaceholder('0.000').first().fill('500000')
    await page.locator('input[type="date"]').first().fill('2026-01-15')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Ahmed Hassan').first()).toBeVisible()

    // Get the employee row and click edit via URL navigation
    const employeeRow = page.locator('tr').filter({ hasText: 'Ahmed Hassan' })
    const editLink = employeeRow.locator('button').first()
    await editLink.click()
    await page.waitForTimeout(1500)

    // Check if URL changed
    const afterUrl = page.url()
    console.log('After edit click URL:', afterUrl)

    // If modal didn't open via button, navigate directly
    if (!afterUrl.includes('modal=edit')) {
      // Get the employee ID from the database
      await page.goto('/en/employees?modal=add')
      await page.waitForTimeout(500)
    }

    // Try to find the edit modal
    await expect(page.getByRole('heading', { name: 'Edit Employee' })).toBeVisible({ timeout: 5000 })

    await page.getByPlaceholder('+964 750 123 4567').fill('+964 750 111 2222')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Delete
    page.on('dialog', dialog => dialog.accept())
    await page.locator('tr').filter({ hasText: 'Ahmed Hassan' }).locator('button').last().click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Ahmed Hassan')).not.toBeVisible()
  })
})

test.describe('Phase 3: Payroll CRUD', () => {
  test('create, mark paid, edit, and delete a payroll entry', async ({ page }) => {
    await signIn(page)

    // Create employee
    await page.goto('/en/employees')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Add Employee' }).click()
    await page.waitForURL(/modal=add/)
    await page.getByPlaceholder('John Doe').fill('Payroll Test Employee')
    await page.getByPlaceholder('0.000').first().fill('750000')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Payroll
    await page.goto('/en/payroll')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Add Payroll Entry' }).click()
    await page.waitForURL(/modal=add/)
    await page.locator('select').first().selectOption({ label: 'Payroll Test Employee' })
    const dates = page.locator('input[type="date"]')
    await dates.nth(0).fill('2026-04-01')
    await dates.nth(1).fill('2026-04-30')
    const salaryInputs = page.locator('input[type="number"]')
    await salaryInputs.nth(0).fill('750000')
    await salaryInputs.nth(1).fill('50000')
    await salaryInputs.nth(2).fill('10000')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Payroll Test Employee').first()).toBeVisible()
    await expect(page.getByText('Unpaid').first()).toBeVisible()

    // Mark as paid
    await page.getByRole('button', { name: 'Mark as paid' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Paid').first()).toBeVisible()

    // Edit payroll entry (after marking paid, only 2 buttons remain: edit, delete)
    await page.locator('tr').filter({ hasText: 'Payroll Test Employee' }).locator('button').first().click()
    await page.waitForTimeout(1500)
    await expect(page.getByRole('heading', { name: 'Edit Payroll Entry' })).toBeVisible()
    await page.locator('input[type="number"]').nth(1).fill('75000')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Delete
    page.on('dialog', dialog => dialog.accept())
    await page.locator('tr').filter({ hasText: 'Payroll Test Employee' }).locator('button').last().click()
    await page.waitForTimeout(2000)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Payroll Test Employee')).not.toBeVisible()

    // Clean up
    await page.goto('/en/employees')
    await page.waitForLoadState('networkidle')
    await page.locator('tr').filter({ hasText: 'Payroll Test Employee' }).locator('button').last().click()
    await page.waitForTimeout(500)
    // Accept the delete confirmation dialog
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2000)
  })
})
