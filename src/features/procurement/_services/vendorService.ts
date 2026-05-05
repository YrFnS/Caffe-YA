import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { vendors } from '@/lib/schema'
import type { VendorRow } from '../_types'

export async function getAllVendors(includeInactive = false): Promise<VendorRow[]> {
  const rows = await db.query.vendors.findMany({ orderBy: [desc(vendors.createdAt)] })
  return includeInactive ? rows : rows.filter(v => v.isActive) as VendorRow[]
}

export async function getVendorById(id: string): Promise<VendorRow | null> {
  return db.query.vendors.findFirst({ where: eq(vendors.id, id) })
}

export async function createVendor(data: {
  name: string
  phone?: string | null
  address?: string | null
}): Promise<VendorRow> {
  const [row] = await db.insert(vendors).values(data).returning()
  return row
}

export async function updateVendor(
  id: string,
  data: { name?: string; phone?: string | null; address?: string | null; isActive?: boolean }
): Promise<VendorRow | null> {
  const [updated] = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning()
  return updated ?? null
}

export async function deleteVendor(id: string): Promise<void> {
  await db.delete(vendors).where(eq(vendors.id, id))
}