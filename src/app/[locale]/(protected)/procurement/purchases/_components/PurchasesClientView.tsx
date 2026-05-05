'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { getAllPurchases } from '@/features/procurement/_services/purchaseService'
import { getAllVendors } from '@/features/procurement/_services/vendorService'
import PurchasesList from '@/features/procurement/_components/PurchasesList'
import PurchaseForm from '@/features/procurement/_components/PurchaseForm'
import type { PurchaseRow, VendorRow } from '@/features/procurement/_types'

interface PurchasesClientViewProps {
  purchases: PurchaseRow[]
  vendors: VendorRow[]
}

export default function PurchasesClientView({ purchases, vendors }: PurchasesClientViewProps) {
  const t = useTranslations('procurement')
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('purchases')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="h-12 px-6 rounded-lg bg-primary text-on-primary font-medium"
        >
          {t('newPurchase')}
        </button>
      </div>
      <PurchasesList
        purchases={purchases}
        onNewPurchase={() => setShowForm(false)}
        onViewReceipt={() => {}}
      />
      {showForm && (
        <PurchaseForm
          vendors={vendors}
          onSuccess={() => window.location.reload()}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}