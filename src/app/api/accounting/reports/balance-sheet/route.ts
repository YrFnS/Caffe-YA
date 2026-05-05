import { NextRequest, NextResponse } from 'next/server'
import { getBalanceSheetReport } from '@/features/accounting/_services/reportService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate')

    if (!asOfDate) {
      return NextResponse.json(
        { error: 'asOfDate is required' },
        { status: 400 }
      )
    }

    const data = await getBalanceSheetReport(new Date(asOfDate))
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating balance sheet report:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    )
  }
}
