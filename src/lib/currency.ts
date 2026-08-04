const SCALE = 1000
const BIG_SCALE = BigInt(SCALE)

/** Parse a DB numeric(…,3) value into integer thousandths without floats. */
export function toCents(amount: string): number {
  const match = amount.trim().match(/^(-?)(\d+)(?:\.(\d{1,3}))?$/)
  if (!match) throw new Error('INVALID_MONEY')

  const [, sign, whole, fraction = ''] = match
  const millimes = Number(whole) * SCALE + Number(fraction.padEnd(3, '0'))
  if (!Number.isSafeInteger(millimes)) throw new Error('MONEY_OUT_OF_RANGE')
  return sign ? -millimes : millimes
}

/** Convert integer thousandths to the canonical DB numeric string. */
export function fromCents(millimes: number): string {
  if (!Number.isSafeInteger(millimes)) throw new Error('INVALID_MILLIMES')
  const sign = millimes < 0 ? '-' : ''
  const absolute = Math.abs(millimes)
  return `${sign}${Math.floor(absolute / SCALE)}.${String(absolute % SCALE).padStart(3, '0')}`
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('INVALID_DIVISOR')
  const negative = numerator < 0n
  const absolute = negative ? -numerator : numerator
  const result = (absolute + denominator / 2n) / denominator
  return negative ? -result : result
}

function safeBigIntToNumber(value: bigint): number {
  const numberValue = Number(value)
  if (!Number.isSafeInteger(numberValue)) throw new Error('MONEY_OUT_OF_RANGE')
  return numberValue
}

export function addMoney(...amounts: string[]): string {
  return fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0))
}

export function multiplyMoney(amount: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity)) throw new Error('INVALID_QUANTITY')
  return fromCents(toCents(amount) * quantity)
}

export function multiplyDecimalMoney(amount: string, quantity: string): string {
  return multiplyDecimalMoneyMany(amount, quantity)
}

/**
 * Multiply a unit money value by one or more numeric(…,3) quantities with one
 * final rounding operation. This avoids compounding rounding error for recipes.
 */
export function multiplyDecimalMoneyMany(amount: string, ...quantities: string[]): string {
  let numerator = BigInt(toCents(amount))
  let denominator = 1n

  for (const quantity of quantities) {
    numerator *= BigInt(toCents(quantity))
    denominator *= BIG_SCALE
  }

  return fromCents(safeBigIntToNumber(divideRounded(numerator, denominator)))
}

/**
 * Calculate a weighted-average unit cost from current and incoming stock.
 * Quantities and unit costs are canonical numeric(…,3) strings.
 */
export function weightedAverageUnitCost(
  currentQuantity: string,
  currentUnitCost: string,
  incomingQuantity: string,
  incomingUnitCost: string,
): string {
  const currentQty = BigInt(toCents(currentQuantity))
  const incomingQty = BigInt(toCents(incomingQuantity))
  if (currentQty < 0n || incomingQty <= 0n) throw new Error('INVALID_QUANTITY')

  const totalQuantity = currentQty + incomingQty
  const totalCost = BigInt(toCents(currentUnitCost)) * currentQty
    + BigInt(toCents(incomingUnitCost)) * incomingQty

  return fromCents(safeBigIntToNumber(divideRounded(totalCost, totalQuantity)))
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

export function calculatePayrollNet(base: string, bonuses = '0', deductions = '0'): string {
  return fromCents(toCents(base) + toCents(bonuses) - toCents(deductions))
}

export function calculateShiftVariance(opening: string, cashSales: string, cashExpenses: string, counted: string): string {
  return fromCents(toCents(counted) - (toCents(opening) + toCents(cashSales) - toCents(cashExpenses)))
}

export function isJournalBalanced(lines: Array<{ type: 'debit' | 'credit'; amount: string }>): boolean {
  const total = (type: 'debit' | 'credit') => lines
    .filter(line => line.type === type)
    .reduce((sum, line) => sum + toCents(line.amount), 0)
  return total('debit') === total('credit')
}
