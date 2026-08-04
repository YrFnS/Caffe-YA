import assert from 'node:assert/strict'
import test from 'node:test'
import { getBaghdadReportRange } from '../../src/features/reports/reportDateRange.ts'

test('report range maps Baghdad calendar days to exact UTC boundaries', () => {
  const range = getBaghdadReportRange(
    { from: '2026-07-01', to: '2026-07-31' },
    new Date('2026-07-30T09:00:00.000Z'),
  )

  assert.equal(range.from.toISOString(), '2026-06-30T21:00:00.000Z')
  assert.equal(range.to.toISOString(), '2026-07-31T20:59:59.999Z')
  assert.equal(range.fromInput, '2026-07-01')
  assert.equal(range.toInput, '2026-07-31')
})

test('report range defaults to the current Baghdad month and normalizes reversed dates', () => {
  const defaultRange = getBaghdadReportRange({}, new Date('2026-07-31T22:30:00.000Z'))
  assert.equal(defaultRange.fromInput, '2026-08-01')
  assert.equal(defaultRange.toInput, '2026-08-01')

  const reversed = getBaghdadReportRange(
    { from: '2026-07-30', to: '2026-07-01' },
    new Date('2026-07-30T09:00:00.000Z'),
  )
  assert.equal(reversed.fromInput, '2026-07-01')
  assert.equal(reversed.toInput, '2026-07-30')
})

test('invalid date input falls back without accepting impossible calendar dates', () => {
  const range = getBaghdadReportRange(
    { from: '2026-02-30', to: 'not-a-date' },
    new Date('2026-07-30T09:00:00.000Z'),
  )

  assert.equal(range.fromInput, '2026-07-01')
  assert.equal(range.toInput, '2026-07-30')
})
