const PAYMENT_ACCOUNT_CODES: Record<string, string> = {
  cash: '1001',
  card: '1010',
  mobile_wallet: '1020',
  // Legacy rows may still contain the old synthetic split method.
  split: '1001',
}

export function getPaymentAccountCode(paymentMethod: string): string {
  const accountCode = PAYMENT_ACCOUNT_CODES[paymentMethod]
  if (!accountCode) throw new Error('PAYMENT_ACCOUNT_NOT_CONFIGURED')
  return accountCode
}
