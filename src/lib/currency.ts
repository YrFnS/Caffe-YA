const SCALE = 1000

/** Parse a DB numeric(…,3) money string into integer millimes without floats. */
export function toCents(amount: string): number {
  const match = amount.trim().match(/^(-?)(\d+)(?:\.(\d{1,3}))?$/)
  if (!match) throw new Error('INVALID_MONEY')

  const [, sign, whole, fraction = ''] = match
  const millimes = Number(whole) * SCALE + Number(fraction.padEnd(3, '0'))
  if (!Number.isSafeInteger(millimes)) throw new Error('MONEY_OUT_OF_RANGE')
  return sign ? -millimes : millimes
}

/** Convert integer millimes to the canonical DB numeric string. */
export function fromCents(millimes: number): string {
  if (!Number.isSafeInteger(millimes)) throw new Error('INVALID_MILLIMES')
  const sign = millimes < 0 ? '-' : ''
  const absolute = Math.abs(millimes)
  return `${sign}${Math.floor(absolute / SCALE)}.${String(absolute % SCALE).padStart(3, '0')}`
}

export function addMoney(...amounts: string[]): string {
  return fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0))
}

export function multiplyMoney(amount: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity)) throw new Error('INVALID_QUANTITY')
  return fromCents(toCents(amount) * quantity)
}

export function multiplyDecimalMoney(amount: string, quantity: string): string {
  return fromCents(Math.round(toCents(amount) * toCents(quantity) / SCALE))
}

export function prorateMoney(amount: string, numerator: number, denominator: number): string {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error('INVALID_RATIO')
  }
  return fromCents(Math.round(toCents(amount) * numerator / denominator))
}

export function formatCurrency(amount: string): string {
  const millimes = toCents(amount)
  const sign = millimes < 0 ? '-' : ''
  const absolute = Math.abs(millimes)
  const whole = String(Math.floor(absolute / SCALE)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = absolute % SCALE
  return `${sign}${whole}${fraction ? `.${String(fraction).padStart(3, '0').replace(/0+$/, '')}` : ''}`
}
