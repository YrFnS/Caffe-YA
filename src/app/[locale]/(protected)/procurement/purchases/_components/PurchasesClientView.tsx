'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/lib/navigation'
import PurchasesList from '@/features/procurement/_components/PurchasesList'
import PurchaseForm from '@/features/procurement/_components/PurchaseForm'
import GoodsReceiptForm from '@/features/procurement/_components/GoodsReceiptForm'
import PurchasePaymentModal from '@/features/procurement/_components/PurchasePaymentModal'
import type { PurchaseRow, VendorRow } from '@/features/procurement/_types'
import type { PurchasePaymentAccount } from '@/features/procurement/_services/purchaseService'
import { deletePurchaseAction } from '@/features/procurement/_actions/procurementActions'
import { formatCurrency } from '@/lib/currency'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface PurchasesClientViewProps {
  purchases: PurchaseRow[]
  vendors: VendorRow[]
  ingredients: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; nameAr: string | null }>
  paymentAccounts: PurchasePaymentAccount[]
  permissions: {
    canCreate: boolean
    canReceive: boolean
    canPay: boolean
    canDelete: boolean
  }
}

export default function PurchasesClientView({
  purchases,
  vendors,
  ingredients,
  products,
  paymentAccounts,
  permissions,
}: PurchasesClientViewProps) {
  const t = useTranslations('procurement')
  const locale = useLocale()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [receivingPurchase, setReceivingPurchase] = useState<PurchaseRow | null>(null)
  const [paymentPurchase, setPaymentPurchase] = useState<PurchaseRow | null>(null)
  const [detailPurchase, setDetailPurchase] = useState<PurchaseRow | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const closeLabel = locale === 'ar' ? 'إغلاق' : 'Close'

  function refresh() {
    router.refresh()
  }

  async function deletePurchase(id: string) {
    if (!permissions.canDelete || !window.confirm(t('confirmDelete'))) return
    setBusy(true)
    setError('')
    try {
      const result = await deletePurchaseAction(id)
      if (result.error) {
        setError(result.error === 'PURCHASE_CANNOT_BE_DELETED' ? t('cannotDelete') : t('operationFailed'))
        return
      }
      refresh()
    } catch (actionError) {
      console.error('Delete purchase failed:', actionError)
      setError(t('operationFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('purchases')}</h1>
        {permissions.canCreate && (
          <Button onClick={() => setShowForm(true)} disabled={busy}>{t('newPurchase')}</Button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      <PurchasesList
        purchases={purchases}
        onNewPurchase={() => permissions.canCreate && setShowForm(true)}
        onViewReceipt={id => permissions.canReceive && setReceivingPurchase(purchases.find(purchase => purchase.id === id) ?? null)}
        onViewDetails={id => setDetailPurchase(purchases.find(purchase => purchase.id === id) ?? null)}
        onPay={id => permissions.canPay && setPaymentPurchase(purchases.find(purchase => purchase.id === id) ?? null)}
        onDelete={deletePurchase}
        permissions={permissions}
        disabled={busy}
      />

      {permissions.canCreate && showForm && (
        <PurchaseForm
          vendors={vendors}
          ingredients={ingredients}
          products={products}
          onSuccess={() => {
            setShowForm(false)
            refresh()
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {permissions.canReceive && receivingPurchase && (
        <GoodsReceiptForm
          purchase={receivingPurchase}
          onClose={() => setReceivingPurchase(null)}
          onSuccess={() => {
            setReceivingPurchase(null)
            refresh()
          }}
        />
      )}

      {permissions.canPay && paymentPurchase && (
        <PurchasePaymentModal
          purchase={paymentPurchase}
          accounts={paymentAccounts}
          onClose={() => setPaymentPurchase(null)}
          onSuccess={() => {
            setPaymentPurchase(null)
            refresh()
          }}
        />
      )}

      {detailPurchase && (
        <Modal
          open
          onClose={() => setDetailPurchase(null)}
          title={t('purchaseDetails')}
          size="lg"
          closeLabel={closeLabel}
          footer={<Button onClick={() => setDetailPurchase(null)}>{t('close')}</Button>}
        >
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl bg-surface-container-low p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-on-surface-variant">{t('vendor')}</p>
                <p className="font-medium">{detailPurchase.vendorName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">{t('total')}</p>
                <p className="font-mono font-bold">{formatCurrency(detailPurchase.totalAmount)} IQD</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">{t('received')}</p>
                <p>{detailPurchase.receivedAt ? t('yes') : t('no')}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">{t('paid')}</p>
                <p>{detailPurchase.isPaid ? t('yes') : t('no')}</p>
              </div>
            </div>

            <div className="space-y-2">
              {detailPurchase.items?.map(item => (
                <div key={item.id} className="grid gap-2 rounded-xl bg-surface-container-lowest p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <span className="font-medium">
                    {item.ingredientName ?? (locale === 'ar' ? item.productNameAr || item.productName : item.productName) ?? '—'}
                  </span>
                  <span className="font-mono text-sm">
                    {item.quantity} × {formatCurrency(item.unitCost)} = {formatCurrency(item.totalCost)} IQD
                  </span>
                </div>
              ))}
            </div>

            {detailPurchase.receiptNote && (
              <div className="rounded-xl bg-surface-container-low p-3 text-sm">
                <span className="font-medium">{t('receiptNote')}:</span> {detailPurchase.receiptNote}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
