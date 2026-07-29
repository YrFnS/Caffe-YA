import assert from 'node:assert/strict'
import test from 'node:test'
import { getPaymentAccountCode } from '../../src/lib/accounting.ts'

test('maps each supported payment method to its clearing account', () => {
  assert.equal(getPaymentAccountCode('cash'), '1001')
  assert.equal(getPaymentAccountCode('card'), '1010')
  assert.equal(getPaymentAccountCode('mobile_wallet'), '1020')
})

test('keeps legacy split transactions refundable through cash clearing', () => {
  assert.equal(getPaymentAccountCode('split'), '1001')
})

test('rejects unknown payment methods', () => {
  assert.throws(() => getPaymentAccountCode('crypto'), /PAYMENT_ACCOUNT_NOT_CONFIGURED/)
})
