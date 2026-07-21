import { db } from '@/lib/db'
import { eq, desc, sql } from 'drizzle-orm'
import { journalEntries, journalEntryLines } from '@/lib/schema'
import type { JournalEntryRow } from '../_types'
import { toCents } from '@/lib/currency'

export async function getAllJournalEntries(limit = 50): Promise<JournalEntryRow[]> {
  const rows = await db.query.journalEntries.findMany({
    orderBy: [desc(journalEntries.createdAt)],
    limit,
    with: {
      lines: {
        with: { account: true },
      },
    },
  })
  return rows.map(r => ({
    ...r,
    creatorName: null,
    lines: r.lines.map(l => ({
      id: l.id,
      journalEntryId: l.journalEntryId,
      accountId: l.accountId,
      accountName: l.account.name,
      accountCode: l.account.code,
      type: l.type as 'debit' | 'credit',
      amount: l.amount,
      note: l.note,
    })),
  })) as JournalEntryRow[]
}

export async function getJournalEntryById(id: string): Promise<JournalEntryRow | null> {
  const row = await db.query.journalEntries.findFirst({
    where: eq(journalEntries.id, id),
    with: {
      lines: {
        with: { account: true },
      },
    },
  })
  if (!row) return null
  return {
    ...row,
    creatorName: null,
    lines: row.lines.map(l => ({
      id: l.id,
      journalEntryId: l.journalEntryId,
      accountId: l.accountId,
      accountName: l.account.name,
      accountCode: l.account.code,
      type: l.type as 'debit' | 'credit',
      amount: l.amount,
      note: l.note,
    })),
  } as JournalEntryRow
}

export async function createJournalEntry(data: {
  reference?: string | null
  description?: string | null
  sourceType?: string | null
  sourceId?: string | null
  createdBy?: string
  lines: { accountId: string; type: 'debit' | 'credit'; amount: string; note?: string | null }[]
}): Promise<JournalEntryRow> {
  // Validate double-entry: total debits must equal total credits
  const totalDebit = data.lines
    .filter(l => l.type === 'debit')
    .reduce((sum, l) => sum + toCents(l.amount), 0)
  const totalCredit = data.lines
    .filter(l => l.type === 'credit')
    .reduce((sum, l) => sum + toCents(l.amount), 0)

  if (totalDebit !== totalCredit) {
    throw new Error(`Debits (${totalDebit}) must equal credits (${totalCredit})`)
  }

  const entryId = await db.transaction(async (tx) => {
    const [entry] = await tx.insert(journalEntries).values({
      reference: data.reference,
      description: data.description,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      createdBy: data.createdBy,
    }).returning()

    await tx.insert(journalEntryLines).values(data.lines.map(line => ({
      journalEntryId: entry.id,
      accountId: line.accountId,
      type: line.type,
      amount: line.amount,
      note: line.note ?? null,
    })))
    return entry.id
  })

  return getJournalEntryById(entryId) as Promise<JournalEntryRow>
}

export async function getAccountBalance(accountId: string): Promise<{ debit: string; credit: string }> {
  const result = await db
    .select({
      debit: sql<string>`COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'debit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END), 0)`,
      credit: sql<string>`COALESCE(SUM(CASE WHEN ${journalEntryLines.type} = 'credit' THEN ${journalEntryLines.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(journalEntryLines)
    .where(eq(journalEntryLines.accountId, accountId))

  return { debit: result[0]?.debit ?? '0', credit: result[0]?.credit ?? '0' }
}
