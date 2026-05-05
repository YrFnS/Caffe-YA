import { NextRequest, NextResponse } from 'next/server'
import { getPLReport } from '@/features/accounting/_services/reportService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'periodStart and periodEnd are required' },
        { status: 400 }
      )
    }

    const data = await getPLReport(new Date(periodStart), new Date(periodEnd))
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating P&L report:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    )
  }
}
