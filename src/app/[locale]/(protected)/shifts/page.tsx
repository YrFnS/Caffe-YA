import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import {
  getActiveShiftForUser,
  getShiftHistory,
  getCashSales,
  getCashExpenses,
  getActiveResources,
} from '@/features/shifts/_services/shiftService'
import ShiftsClientView from './_components/ShiftsClientView'
import { hasPermission } from '@/features/admin/_actions/adminActions'

export default async function ShiftsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string
  const activeShift = await getActiveShiftForUser(userId)
  const history = await getShiftHistory()
  const canApproveVariance = await hasPermission(userId, 'shifts.approve')

  // Pre-calculate cash data for close overlay
  let openingFloat = '0'
  let cashSales = '0'
  let cashExpenses = '0'
  let activeResources: Array<{ id: string; name: string; orderId: string }> = []

  if (activeShift) {
    openingFloat = activeShift.openingFloat
    cashSales = await getCashSales(activeShift.id)
    cashExpenses = await getCashExpenses(activeShift.id)
    activeResources = await getActiveResources(activeShift.id)
  }

  return (
    <ShiftsClientView
      activeShift={activeShift}
      history={history}
      cashierName={session.user.name || 'Cashier'}
      openingFloat={openingFloat}
      cashSales={cashSales}
      cashExpenses={cashExpenses}
      activeResources={activeResources}
      canApproveVariance={canApproveVariance}
    />
  )
}
