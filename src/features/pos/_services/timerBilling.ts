import { addMoney, prorateMoney } from '../../../lib/currency.ts'

export function addTimedCharge(
  currentCharge: string,
  hourlyRate: string,
  elapsedMinutes: number,
  minimumMinutes = 0,
  graceMinutes = 0,
) {
  const chargeableMinutes = Math.max(elapsedMinutes - graceMinutes, minimumMinutes)
  return {
    chargeableMinutes,
    charge: addMoney(currentCharge, prorateMoney(hourlyRate, chargeableMinutes, 60)),
  }
}
