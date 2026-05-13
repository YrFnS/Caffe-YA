import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { partners, partnerEquityEntries } from '@/lib/schema'
import type { PartnerRow, PartnerEquityEntryRow, PartnerDashboard } from '../_types'
import { toCents, fromCents } from '@/lib/currency'

export async function getAllPartners(): Promise<PartnerRow[]> {
  const rows = await db.query.partners.findMany({ orderBy: [desc(partners.createdAt)] })
  return rows.map(r => ({
    ...r,
    userName: null,
    userEmail: null,
  })) as PartnerRow[]
}

export async function getPartnerById(id: string): Promise<PartnerRow | null> {
  const row = await db.query.partners.findFirst({ where: eq(partners.id, id) })
  if (!row) return null
  return { ...row, userName: null, userEmail: null } as PartnerRow
}

export async function createPartner(data: {
  userId: string
  ownershipPercent: string
}): Promise<PartnerRow> {
  const [row] = await db.insert(partners).values(data).returning()
  return { ...row, userName: null, userEmail: null } as PartnerRow
}

export async function getEquityHistory(partnerId: string): Promise<PartnerEquityEntryRow[]> {
  const rows = await db.query.partnerEquityEntries.findMany({
    where: eq(partnerEquityEntries.partnerId, partnerId),
    orderBy: [desc(partnerEquityEntries.createdAt)],
  })
  return rows as PartnerEquityEntryRow[]
}

export async function getPartnerDashboard(partnerId: string): Promise<PartnerDashboard | null> {
  const partner = await getPartnerById(partnerId)
  if (!partner) return null

  const entries = await getEquityHistory(partnerId)

  const totalInjected = entries
    .filter(e => e.type === 'capital_injection')
    .reduce((s, e) => s + toCents(Number(e.amount)), 0)
  const totalDistributions = entries
    .filter(e => e.type === 'draw' || e.type === 'profit_share')
    .reduce((s, e) => s + toCents(Number(e.amount)), 0)
  const currentEquity = totalInjected - totalDistributions

  return {
    partner,
    currentEquity: fromCents(currentEquity),
    totalCapitalInjected: fromCents(totalInjected),
    totalDistributions: fromCents(totalDistributions),
    ownershipPercent: partner.ownershipPercent,
  }
}

export async function addCapitalInjection(data: {
  partnerId: string
  amount: string
  note?: string
  createdBy?: string
}): Promise<PartnerEquityEntryRow> {
  const [row] = await db.insert(partnerEquityEntries).values({
    partnerId: data.partnerId,
    type: 'capital_injection',
    amount: data.amount,
    note: data.note ?? null,
    createdBy: data.createdBy ?? null,
  }).returning()
  return row as PartnerEquityEntryRow
}

export async function addProfitDistribution(data: {
  partnerId: string
  amount: string
  note?: string
  createdBy?: string
}): Promise<PartnerEquityEntryRow> {
  const [row] = await db.insert(partnerEquityEntries).values({
    partnerId: data.partnerId,
    type: 'profit_share',
    amount: data.amount,
    note: data.note ?? null,
    createdBy: data.createdBy ?? null,
  }).returning()
  return row as PartnerEquityEntryRow
}

export async function addDraw(data: {
  partnerId: string
  amount: string
  note?: string
  createdBy?: string
}): Promise<PartnerEquityEntryRow> {
  const [row] = await db.insert(partnerEquityEntries).values({
    partnerId: data.partnerId,
    type: 'draw',
    amount: data.amount,
    note: data.note ?? null,
    createdBy: data.createdBy ?? null,
  }).returning()
  return row as PartnerEquityEntryRow
}
