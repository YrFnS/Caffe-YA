import assert from 'node:assert/strict'
import test from 'node:test'
import { addMoney, fromCents, multiplyDecimalMoney, multiplyMoney, prorateMoney, toCents } from '../../src/lib/currency.ts'

test('money arithmetic stays in integer millimes', () => {
  assert.equal(toCents('250000.125'), 250000125)
  assert.equal(fromCents(-1500), '-1.500')
  assert.equal(addMoney('250000', '16000', '-3500'), '262500.000')
  assert.equal(multiplyMoney('4500', 3), '13500.000')
  assert.equal(multiplyDecimalMoney('1250.500', '2.500'), '3126.250')
  assert.equal(prorateMoney('5000', 30, 60), '2500.000')
})

test('shift variance does not mix dinars and millimes', () => {
  const expected = toCents('250000') + toCents('16000') - toCents('3500')
  const variance = toCents('263000') - expected
  assert.equal(fromCents(expected), '262500.000')
  assert.equal(fromCents(variance), '500.000')
})

test('invalid money is rejected', () => {
  assert.throws(() => toCents('1.2345'), /INVALID_MONEY/)
  assert.throws(() => toCents('NaN'), /INVALID_MONEY/)
})
