"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import OpenShiftModal from '@/features/shifts/_components/OpenShiftModal'
import CloseShiftOverlay from '@/features/shifts/_components/CloseShiftOverlay'
import ShiftStatusCard from '@/features/shifts/_components/ShiftStatusCard'
import ShiftHistoryTable from '@/features/shifts/_components/ShiftHistoryTable'
import type { ShiftSummary } from '@/features/shifts/_types'

interface ShiftsClientViewProps {
  activeShift: ShiftSummary | null
  history: ShiftSummary[]
  cashierName: string
  openingFloat?: string
  cashSales?: string
  cashExpenses?: string
  activeResources?: Array<{ id: string; name: string; orderId: string }>
}

export default function ShiftsClientView({
  activeShift,
  history,
  cashierName,
  openingFloat = '0',
  cashSales = '0',
  cashExpenses = '0',
  activeResources = [],
}: ShiftsClientViewProps) {
  const t = useTranslations('shifts')
  const [showOpenModal, setShowOpenModal] = useState(!activeShift)
  const [showCloseOverlay, setShowCloseOverlay] = useState(false)

  const handleShiftOpened = () => {
    setShowOpenModal(false)
    window.location.reload()
  }

  const handleShiftClosed = () => {
    setShowCloseOverlay(false)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
        {!activeShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="h-12 px-6 rounded-lg bg-primary text-on-primary font-medium"
          >
            {t('openShift')}
          </button>
        )}
      </div>

      {/* Active shift status card */}
      {activeShift && (
        <ShiftStatusCard
          shiftId={activeShift.id}
          cashierName={cashierName}
          openedAt={new Date(activeShift.openedAt)}
          onCloseShift={() => setShowCloseOverlay(true)}
        />
      )}

      {/* Shift history */}
      <div>
        <h2 className="text-headline-sm font-semibold text-on-surface mb-4">{t('history')}</h2>
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
          <ShiftHistoryTable history={history} />
        </div>
      </div>

      {/* Modals */}
      {showOpenModal && <OpenShiftModal onSuccess={handleShiftOpened} />}
      {showCloseOverlay && activeShift && (
        <CloseShiftOverlay
          shiftId={activeShift.id}
          openingFloat={openingFloat}
          cashSales={cashSales}
          cashExpenses={cashExpenses}
          activeResources={activeResources}
          onClose={() => setShowCloseOverlay(false)}
          onSuccess={handleShiftClosed}
        />
      )}
    </div>
  )
}
