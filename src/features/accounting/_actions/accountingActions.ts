'use server'

import { createAccount, updateAccount } from '../_services/accountService'
import { createJournalEntry } from '../_services/journalService'
import { chartOfAccounts, journalEntries, journalEntryLines } from '@/lib/schema'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { requirePermission } from '@/features/admin/_actions/adminActions'

async function authorizeAccountingMutation() {
  const session = await getSession()
  if (!session?.user) throw new Error('UNAUTHORIZED')
  await requirePermission(session.user.id, 'accounting.manage')
  return session.user.id
}

const accountInsertSchema = createInsertSchema(chartOfAccounts, {
  code: z.string().min(1),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense']),
  parentId: z.string().uuid().optional(),
})

const journalLineInsertSchema = createInsertSchema(journalEntryLines, {
  accountId: z.string().uuid(),
  type: z.enum(['debit', 'credit']),
  amount: z.string().min(1),
  note: z.string().optional(),
}).omit({ journalEntryId: true })

const journalEntryInsertSchema = createInsertSchema(journalEntries, {
  reference: z.string().optional(),
  description: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().uuid().optional(),
}).extend({
  lines: z.array(journalLineInsertSchema).min(2),
})

export async function createAccountAction(data: z.infer<typeof accountInsertSchema>) {
  await authorizeAccountingMutation()
  const parsed = accountInsertSchema.parse(data)
  return createAccount({ ...parsed, nameAr: data.nameAr ?? null, parentId: data.parentId ?? null })
}

export async function updateAccountAction(id: string, data: Partial<z.infer<typeof accountInsertSchema>>) {
  await authorizeAccountingMutation()
  const parsed = accountInsertSchema.partial().parse(data)
  return updateAccount(id, parsed)
}

export async function createJournalEntryAction(data: z.infer<typeof journalEntryInsertSchema>) {
  const userId = await authorizeAccountingMutation()
  const parsed = journalEntryInsertSchema.parse(data)
  return createJournalEntry({
    reference: parsed.reference ?? null,
    description: parsed.description ?? null,
    sourceType: parsed.sourceType ?? null,
    sourceId: parsed.sourceId ?? null,
    createdBy: userId,
    lines: parsed.lines as Array<{ accountId: string; type: 'debit' | 'credit'; amount: string; note?: string | null }>,
  })
}
