import { db } from '@/lib/db'
import { eq, desc, isNull, and } from 'drizzle-orm'
import { chartOfAccounts } from '@/lib/schema'
import type { AccountRow, AccountType } from '../_types'

export async function getAllAccounts(includeInactive = false): Promise<AccountRow[]> {
  const rows = await db.query.chartOfAccounts.findMany({
    orderBy: [chartOfAccounts.code],
  })
  return includeInactive ? rows as AccountRow[] : rows.filter(a => a.isActive) as AccountRow[]
}

export async function getAccountTree(includeInactive = false): Promise<AccountRow[]> {
  const all = await getAllAccounts(includeInactive)
  const map = new Map<string, AccountRow>()
  const roots: AccountRow[] = []

  for (const acc of all) {
    map.set(acc.id, { ...acc, children: [] })
  }

  for (const acc of all) {
    const node = map.get(acc.id)!
    if (acc.parentId && map.has(acc.parentId)) {
      map.get(acc.parentId)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function getAccountsByType(type: AccountType): Promise<AccountRow[]> {
  const rows = await db.query.chartOfAccounts.findMany({
    where: and(eq(chartOfAccounts.type, type), eq(chartOfAccounts.isActive, true)),
    orderBy: [chartOfAccounts.code],
  })
  return rows as AccountRow[]
}

export async function getAccountById(id: string): Promise<AccountRow | null> {
  return db.query.chartOfAccounts.findFirst({ where: eq(chartOfAccounts.id, id) }) as Promise<AccountRow | null>
}

export async function createAccount(data: {
  code: string
  name: string
  nameAr?: string | null
  type: AccountType
  parentId?: string | null
}): Promise<AccountRow> {
  const [row] = await db.insert(chartOfAccounts).values(data).returning()
  return row as AccountRow
}

export async function updateAccount(
  id: string,
  data: { code?: string; name?: string; nameAr?: string | null; isActive?: boolean; parentId?: string | null }
): Promise<AccountRow | null> {
  const [updated] = await db.update(chartOfAccounts).set(data).where(eq(chartOfAccounts.id, id)).returning()
  return updated as AccountRow | null
}
