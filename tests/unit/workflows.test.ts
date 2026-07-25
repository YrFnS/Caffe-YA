import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { calculatePayrollNet, calculateShiftVariance, isJournalBalanced } from '../../src/lib/currency.ts'
import { isRefundableOrder, validatePayments } from '../../src/features/pos/_services/payment.ts'
import { addTimedCharge } from '../../src/features/pos/_services/timerBilling.ts'

test('split payments require an exact total and references for non-cash lines', () => {
  assert.deepEqual(validatePayments([
    { method: 'cash', amount: '6000' },
    { method: 'card', amount: '4000', reference: 'TERM-1' },
  ], '10000'), [
    { method: 'cash', amount: '6000.000', reference: undefined },
    { method: 'card', amount: '4000.000', reference: 'TERM-1' },
  ])
  assert.throws(() => validatePayments([{ method: 'card', amount: '10000' }], '10000'), /REFERENCE_REQUIRED/)
  assert.throws(() => validatePayments([{ method: 'cash', amount: '9999' }], '10000'), /PAYMENT_MISMATCH/)
})

test('refund eligibility is limited to paid closed orders', () => {
  assert.equal(isRefundableOrder('closed', true), true)
  assert.equal(isRefundableOrder('cancelled', true), false)
  assert.equal(isRefundableOrder('closed', false), false)
})

test('transferred timed sessions retain every station charge', () => {
  const firstStation = addTimedCharge('0', '5000', 0, 30, 5)
  const secondStation = addTimedCharge(firstStation.charge, '5000', 0, 30, 5)
  assert.equal(firstStation.chargeableMinutes, 30)
  assert.equal(firstStation.charge, '2500.000')
  assert.equal(secondStation.charge, '5000.000')
})

test('shift, payroll, and journal calculations use integer millimes', () => {
  assert.equal(calculateShiftVariance('1000', '2500', '500', '3100'), '100.000')
  assert.equal(calculatePayrollNet('10000', '1250.500', '500.250'), '10750.250')
  assert.equal(isJournalBalanced([
    { type: 'debit', amount: '100.125' },
    { type: 'credit', amount: '100.125' },
  ]), true)
  assert.equal(isJournalBalanced([
    { type: 'debit', amount: '100' },
    { type: 'credit', amount: '99.999' },
  ]), false)
})

test('English and Arabic translation keys stay in parity', () => {
  const flatten = (value: unknown, prefix = ''): string[] => Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => child && typeof child === 'object'
      ? flatten(child, `${prefix}${key}.`)
      : `${prefix}${key}`,
  )
  const en = JSON.parse(readFileSync(new URL('../../src/messages/en.json', import.meta.url), 'utf8'))
  const ar = JSON.parse(readFileSync(new URL('../../src/messages/ar.json', import.meta.url), 'utf8'))
  assert.deepEqual(flatten(en).sort(), flatten(ar).sort())
})
