'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import PurchasesList from '@/features/procurement/_components/PurchasesList'
import PurchaseForm from '@/features/procurement/_components/PurchaseForm'
import GoodsReceiptForm from '@/features/procurement/_components/GoodsReceiptForm'
import type { PurchaseRow, VendorRow } from '@/features/procurement/_types'
import { deletePurchaseAction, markPurchasePaidAction } from '@/features/procurement/_actions/procurementActions'
import { formatCurrency } from '@/lib/currency'

interface PurchasesClientViewProps {
  purchases: PurchaseRow[]
  vendors: VendorRow[]
  ingredients: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string }>
}

export default function PurchasesClientView({ purchases, vendors, ingredients, products }: PurchasesClientViewProps) {
  const t = useTranslations('procurement')
  const [showForm, setShowForm] = useState(false)
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseRow | null>(null)
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRow | null>(null)

  async function mutate(id: string, action: 'pay' | 'delete') {
    if (action === 'delete' && !window.confirm(t('confirmDelete'))) return
    const result = action === 'pay' ? await markPurchasePaidAction(id) : await deletePurchaseAction(id)
    if (result.error) window.alert(t(result.error === 'RECEIVE_BEFORE_PAYMENT' ? 'receiveBeforePayment' : result.error === 'PURCHASE_CANNOT_BE_DELETED' ? 'cannotDelete' : 'operationFailed'))
    else window.location.reload()
  }

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
        onViewDetails={id => setDetailPurchase(purchases.find(purchase => purchase.id === id) ?? null)}
        onPay={id => mutate(id, 'pay')}
        onDelete={id => mutate(id, 'delete')}
      />
      {showForm && (
        <PurchaseForm
          vendors={vendors}
          ingredients={ingredients}
          products={products}
          onSuccess={() => window.location.reload()}
          onClose={() => setShowForm(false)}
        />
      )}
      {receivingPurchase && <GoodsReceiptForm purchase={receivingPurchase} onClose={() => setReceivingPurchase(null)} />}
      {detailPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-container-high p-6">
            <h2 className="text-headline-sm font-semibold">{t('purchaseDetails')}</h2>
            <p className="mt-2">{t('received')}: {detailPurchase.receivedAt ? t('yes') : t('no')}</p>
            <p>{t('paid')}: {detailPurchase.isPaid ? t('yes') : t('no')}</p>
            <div className="my-4 space-y-2">
              {detailPurchase.items?.map(item => (
                <div key={item.id} className="flex justify-between rounded bg-surface-container-lowest p-2">
                  <span>{item.ingredientName ?? item.productName}</span>
                  <span>{item.quantity} × {formatCurrency(item.unitCost)}</span>
                </div>
              ))}
            </div>
            {detailPurchase.receiptNote && <p>{t('receiptNote')}: {detailPurchase.receiptNote}</p>}
            <button onClick={() => setDetailPurchase(null)} className="mt-4 w-full rounded-lg border border-outline p-2">{t('close')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
