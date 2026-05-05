/**
 * Format a numeric string as IQD currency using Intl.NumberFormat.
 */
export function formatIQD(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-IQ', {
    style: 'currency',
    currency: 'IQD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num)
}
