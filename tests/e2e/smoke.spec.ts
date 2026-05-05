import { test, expect } from '@playwright/test'

// Pages that should load without errors
const PUBLIC_PAGES = [
  { path: '/', name: 'Home (redirects to /ar)' },
  { path: '/sign-in', name: 'Sign In' },
]

// Protected pages (require auth - will redirect to sign-in)
const PROTECTED_PAGES = [
  { path: '/ar/pos', name: 'POS' },
  { path: '/ar/dashboard', name: 'Dashboard' },
  { path: '/ar/shifts', name: 'Shifts' },
  { path: '/ar/inventory', name: 'Inventory' },
  { path: '/ar/inventory/products', name: 'Inventory Products' },
  { path: '/ar/inventory/ingredients', name: 'Inventory Ingredients' },
  { path: '/ar/inventory/categories', name: 'Inventory Categories' },
  { path: '/ar/inventory/stock-history', name: 'Stock History' },
  { path: '/ar/admin/users', name: 'Admin Users' },
  { path: '/ar/admin/roles', name: 'Admin Roles' },
  { path: '/ar/admin/settings', name: 'Admin Settings' },
  { path: '/ar/expenses', name: 'Expenses' },
  { path: '/ar/expenses/categories', name: 'Expense Categories' },
  { path: '/ar/procurement', name: 'Procurement' },
  { path: '/ar/procurement/vendors', name: 'Vendors' },
  { path: '/ar/procurement/purchases', name: 'Purchases' },
  { path: '/ar/partners', name: 'Partners' },
  { path: '/ar/accounting/reports', name: 'Accounting Reports' },
  { path: '/ar/resources', name: 'Resources' },
]

test.describe('Public Pages', () => {
  for (const page of PUBLIC_PAGES) {
    test(`${page.name} (${page.path}) loads`, async ({ page: p }) => {
      const response = await p.goto(page.path)
      // Accept 200 or 307/302 redirect
      expect(response?.status()).toBeLessThan(400)
    })
  }
})

test.describe('Protected Pages', () => {
  for (const page of PROTECTED_PAGES) {
    test(`${page.name} (${page.path}) loads without crash`, async ({ page: p }) => {
      const response = await p.goto(page.path, { waitUntil: 'domcontentloaded' })
      // Should either load (200) or redirect to sign-in
      expect(response?.status()).toBeLessThan(400)
      // Should not be a 500
      const html = await p.content()
      expect(html).not.toContain('Internal Server Error')
      expect(html).not.toContain('Application error')
    })
  }
})

test.describe('API Routes', () => {
  test('GET /api/accounting/reports/pl returns valid JSON', async ({ request }) => {
    const response = await request.get('/api/accounting/reports/pl?periodStart=2025-01-01&periodEnd=2025-01-31')
    expect(response.status()).toBe(200)
    const json = await response.json()
    expect(json).toBeDefined()
  })

  test('GET /api/accounting/reports/balance-sheet returns valid JSON', async ({ request }) => {
    const response = await request.get('/api/accounting/reports/balance-sheet?asOfDate=2025-01-31')
    expect(response.status()).toBe(200)
    const json = await response.json()
    expect(json).toBeDefined()
  })
})
