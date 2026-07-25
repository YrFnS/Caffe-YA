import { fromCents, toCents } from '../../../lib/currency.ts'

export const paymentMethods = ['cash', 'card', 'mobile_wallet'] as const
export type PaymentMethod = (typeof paymentMethods)[number]
export type PaymentLine = { method: PaymentMethod; amount: string; reference?: string }

export function validatePayments(lines: PaymentLine[], total: string): PaymentLine[] {
  if (!lines.length) throw new Error('PAYMENT_REQUIRED')
  const normalized = lines.map(line => ({
    method: line.method,
    amount: fromCents(toCents(line.amount)),
    reference: line.reference?.trim() || undefined,
  }))
  for (const line of normalized) {
    if (!paymentMethods.includes(line.method) || toCents(line.amount) <= 0) throw new Error('INVALID_PAYMENT')
    if (line.method !== 'cash' && !line.reference) throw new Error('REFERENCE_REQUIRED')
  }
  if (normalized.reduce((sum, line) => sum + toCents(line.amount), 0) !== toCents(total)) {
    throw new Error('PAYMENT_MISMATCH')
  }
  return normalized
}

export function isRefundableOrder(status: string, hasPayments: boolean): boolean {
  return status === 'closed' && hasPayments
}
