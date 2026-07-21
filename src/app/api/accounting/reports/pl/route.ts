import { NextRequest, NextResponse } from 'next/server'
import { getPLReport } from '@/features/accounting/_services/reportService'
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
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'periodStart and periodEnd are required' },
        { status: 400 }
      )
    }

    const start = new Date(`${periodStart}T00:00:00.000Z`)
    const end = new Date(`${periodEnd}T23:59:59.999Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }
    const data = await getPLReport(start, end)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error generating P&L report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
