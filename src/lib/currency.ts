/**
 * Currency utilities for safe integer-cent arithmetic.
 * All money values are stored as integers (not floats) in the DB.
 * Uses Dinero.js v2 for precise decimal arithmetic.
 */

import { dinero as Dinero, toDecimal, IQD } from 'dinero.js'

/**
 * Convert a number or string to integer cents (or millimes for IQD).
 * "10.50" → 10500, 10.5 → 10500, "10" → 10000
 * Uses 3 decimal places (1000 factor) to match DB numeric(12,3) schema.
 */
export function toCents(amount: number | string): number {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return Math.round(num * 1000)
}

/**
 * Convert cents back to a decimal string representation.
 * Use this when you need the raw numeric string to store in DB or pass to Dinero.
 */
export function fromCents(cents: number): string {
  return (cents / 1000).toFixed(3)
}

/**
 * Format cents as human-readable currency string.
 * e.g. 10500 → "10,500 IQD"
 */
export function formatCurrency(cents: number, locale = 'en-IQ', currency = 'IQD'): string {
  const d = Dinero({ amount: cents, currency: IQD })
  return toDecimal(d)
}