import { NextRequest, NextResponse } from 'next/server'
import { getBalanceSheetReport } from '@/features/accounting/_services/reportService'
import { hasPermission } from '@/features/admin/_actions/adminActions'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!await hasPermission(session.user.id, 'accounting.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const asOfDate = searchParams.get('asOfDate')

    if (!asOfDate) {
      return NextResponse.json(
        { error: 'asOfDate is required' },
        { status: 400 }
      )
    }

    const date = new Date(`${asOfDate}T23:59:59.999Z`)
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    const data = await getBalanceSheetReport(date)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating balance sheet report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
