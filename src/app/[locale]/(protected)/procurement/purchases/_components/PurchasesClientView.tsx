'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import PurchasesList from '@/features/procurement/_components/PurchasesList'
import PurchaseForm from '@/features/procurement/_components/PurchaseForm'
import GoodsReceiptForm from '@/features/procurement/_components/GoodsReceiptForm'
import type { PurchaseRow, VendorRow } from '@/features/procurement/_types'

interface PurchasesClientViewProps {
  purchases: PurchaseRow[]
  vendors: VendorRow[]
}

export default function PurchasesClientView({ purchases, vendors }: PurchasesClientViewProps) {
  const t = useTranslations('procurement')
  const [showForm, setShowForm] = useState(false)
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseRow | null>(null)

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
        onViewReceipt={id => setReceivingPurchase(purchases.find(purchase => purchase.id === id) ?? null)}
      />
      {showForm && (
        <PurchaseForm
          vendors={vendors}
          onSuccess={() => window.location.reload()}
          onClose={() => setShowForm(false)}
        />
      )}
      {receivingPurchase && <GoodsReceiptForm purchase={receivingPurchase} onClose={() => setReceivingPurchase(null)} />}
    </div>
  )
}
