'use server'

import { z } from 'zod'
import { createAccount, updateAccount } from '../_services/accountService'
import { createJournalEntry } from '../_services/journalService'

const accountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense']),
  parentId: z.string().uuid().optional(),
})

export async function createAccountAction(data: z.infer<typeof accountSchema>) {
  const parsed = accountSchema.parse(data)
  return createAccount({ ...parsed, nameAr: data.nameAr ?? null, parentId: data.parentId ?? null })
}

export async function updateAccountAction(id: string, data: Partial<z.infer<typeof accountSchema>>) {
  const parsed = accountSchema.partial().parse(data)
  return updateAccount(id, parsed)
}

const journalLineSchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(['debit', 'credit']),
  amount: z.string().min(1),
  note: z.string().optional(),
})

const journalSchema = z.object({
  reference: z.string().optional(),
  description: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().uuid().optional(),
  lines: z.array(journalLineSchema).min(2),
})

export async function createJournalEntryAction(data: z.infer<typeof journalSchema>) {
  const parsed = journalSchema.parse(data)
  return createJournalEntry({ ...parsed, sourceType: data.sourceType ?? null, sourceId: data.sourceId ?? null })
}
