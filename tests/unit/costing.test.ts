import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateReceivedUnitCost,
  calculateRecipeLineCost,
  calculateStandardLineCost,
} from '../../src/features/pos/_services/costing.ts'

test('received resale inventory uses weighted-average unit cost', () => {
  const receipts = [
    { quantity: '10', unitCost: '2000' },
    { quantity: '30', unitCost: '4000' },
  ]
  assert.equal(calculateReceivedUnitCost(receipts), '3500.000')
})

test('standard product COGS uses its current perpetual unit cost', () => {
  assert.equal(calculateStandardLineCost('3500', '2'), '7000.000')
})

test('recipe cost includes every ingredient and sold quantity', () => {
  assert.equal(calculateRecipeLineCost([
    { unitCost: '18', quantityUsed: '18' },
    { unitCost: '3', quantityUsed: '160' },
  ], '2'), '1608.000')
})
