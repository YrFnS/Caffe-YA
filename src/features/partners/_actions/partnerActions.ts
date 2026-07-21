'use server'

import { createPartner } from '../_services/partnerService'
import { addCapitalInjection, addProfitDistribution, addDraw } from '../_services/partnerService'
import { partners } from '@/lib/schema'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { requirePermission } from '@/features/admin/_actions/adminActions'

async function authorize() {
  const session = await getSession()
  if (!session?.user) throw new Error('UNAUTHORIZED')
  await requirePermission(session.user.id, 'partners.manage')
}

const partnerSchema = createInsertSchema(partners, {
  userId: z.string().min(1),
  ownershipPercent: z.string().min(1),
})

export async function createPartnerAction(data: z.infer<typeof partnerSchema>) {
  await authorize()
  const parsed = partnerSchema.parse(data)
  return createPartner(parsed)
}

export async function addCapitalInjectionAction(data: {
  partnerId: string
  amount: string
  note?: string
}) {
  await authorize()
  return addCapitalInjection(data)
}

export async function addProfitDistributionAction(data: {
  partnerId: string
  amount: string
  note?: string
}) {
  await authorize()
  return addProfitDistribution(data)
}

export async function addDrawAction(data: {
  partnerId: string
  amount: string
  note?: string
}) {
  await authorize()
  return addDraw(data)
}
