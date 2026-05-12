'use server'

import { createPartner } from '../_services/partnerService'
import { addCapitalInjection, addProfitDistribution, addDraw } from '../_services/partnerService'
import { partners, partnerEquityEntries } from '@/lib/schema'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

const partnerSchema = createInsertSchema(partners, {
  userId: z.string().min(1),
  ownershipPercent: z.string().min(1),
})

export async function createPartnerAction(data: z.infer<typeof partnerSchema>) {
  const parsed = partnerSchema.parse(data)
  return createPartner(parsed)
}

export async function addCapitalInjectionAction(data: {
  partnerId: string
  amount: string
  note?: string
}) {
  return addCapitalInjection(data)
}

export async function addProfitDistributionAction(data: {
  partnerId: string
  amount: string
  note?: string
}) {
  return addProfitDistribution(data)
}

export async function addDrawAction(data: {
  partnerId: string
  amount: string
  note?: string
}) {
  return addDraw(data)
}
