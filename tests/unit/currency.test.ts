import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addMoney,
  calculatePayrollNet,
  calculateShiftVariance,
  fromCents,
  isJournalBalanced,
  multiplyDecimalMoney,
  multiplyDecimalMoneyMany,
  multiplyMoney,
  prorateMoney,
  toCents,
  weightedAverageUnitCost,
} from '../../src/lib/currency.ts'

test('money arithmetic stays in integer millimes', () => {
  assert.equal(toCents('250000.125'), 250000125)
  assert.equal(fromCents(-1500), '-1.500')
  assert.equal(addMoney('250000', '16000', '-3500'), '262500.000')
  assert.equal(multiplyMoney('4500', 3), '13500.000')
  assert.equal(multiplyDecimalMoney('1250.500', '2.500'), '3126.250')
  assert.equal(prorateMoney('5000', 30, 60), '2500.000')
})

test('recipe costing performs one final rounding step across multiple quantities', () => {
  assert.equal(multiplyDecimalMoneyMany('18', '18', '2'), '648.000')
  assert.equal(multiplyDecimalMoneyMany('0.333', '0.333', '3'), '0.333')
})

test('weighted average unit cost combines current and received inventory exactly', () => {
  assert.equal(weightedAverageUnitCost('10', '2', '10', '4'), '3.000')
  assert.equal(weightedAverageUnitCost('0', '0', '3', '7.125'), '7.125')
  assert.throws(() => weightedAverageUnitCost('10', '2', '0', '4'), /INVALID_QUANTITY/)
})

test('shift and payroll calculations do not mix dinars and millimes', () => {
  const expected = toCents('250000') + toCents('16000') - toCents('3500')
  const variance = toCents('263000') - expected
  assert.equal(fromCents(expected), '262500.000')
  assert.equal(fromCents(variance), '500.000')
  assert.equal(calculateShiftVariance('250000', '16000', '3500', '263000'), '500.000')
  assert.equal(calculatePayrollNet('850000', '50000', '12500'), '887500.000')
})

test('journal balance compares exact debit and credit totals', () => {
  assert.equal(isJournalBalanced([
    { type: 'debit', amount: '100.100' },
    { type: 'debit', amount: '0.025' },
    { type: 'credit', amount: '100.125' },
  ]), true)
  assert.equal(isJournalBalanced([
    { type: 'debit', amount: '100.100' },
    { type: 'credit', amount: '100.101' },
  ]), false)
})

test('invalid money is rejected', () => {
  assert.throws(() => toCents('1.2345'), /INVALID_MONEY/)
  assert.throws(() => toCents('NaN'), /INVALID_MONEY/)
})
