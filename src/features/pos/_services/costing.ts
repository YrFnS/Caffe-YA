import {
  addMoney,
  fromCents,
  multiplyDecimalMoney,
  multiplyDecimalMoneyMany,
  toCents,
  weightedAverageUnitCost,
} from '@/lib/currency'

export interface ReceivedCostRow {
  quantity: string
  unitCost: string
}

export interface RecipeCostRow {
  quantityUsed: string
  unitCost: string
}

export function calculateReceivedUnitCost(rows: ReceivedCostRow[]): string {
  let totalQuantity = '0.000'
  let unitCost = '0.000'

  for (const row of rows) {
    unitCost = weightedAverageUnitCost(totalQuantity, unitCost, row.quantity, row.unitCost)
    totalQuantity = addMoney(totalQuantity, row.quantity)
  }

  return unitCost
}

export function calculateStandardLineCost(
  receiptRows: ReceivedCostRow[],
  soldQuantity: string,
): string {
  if (!receiptRows.length) return '0.000'
  return multiplyDecimalMoney(calculateReceivedUnitCost(receiptRows), soldQuantity)
}

export function calculateRecipeLineCost(
  ingredients: RecipeCostRow[],
  soldQuantity: string,
): string {
  const total = ingredients.reduce(
    (sum, ingredient) => sum + toCents(multiplyDecimalMoneyMany(
      ingredient.unitCost,
      ingredient.quantityUsed,
      soldQuantity,
    )),
    0,
  )
  return fromCents(total)
}
