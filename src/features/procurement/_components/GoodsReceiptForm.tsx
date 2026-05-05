'use client'

import { useTranslations } from 'next-intl'
import type { PurchaseRow } from '../_types'

interface GoodsReceiptFormProps {
  purchase: PurchaseRow
  onSuccess: () => void
  onClose: () => void
}

// NOTE: Goods Receipts require goodsReceipts/goodsReceiptItems tables in schema.
// This component is scaffolded and will be functional once those tables are added
// via a schema migration, then uncomment the full implementation.
export default function GoodsReceiptForm({ purchase, onSuccess, onClose }: GoodsReceiptFormProps) {
  const t = useTranslations('procurement')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-lg shadow-xl">
        <h2 className="text-headline-sm font-semibold mb-4">{t('receiveGoods')}</h2>
        <p className="text-body-sm text-on-surface-variant mb-4">
          {t('vendor')}: {purchase.vendorName ?? '—'} — {Number(purchase.totalAmount).toLocaleString()}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          Goods receipts table not yet in schema. This feature will be enabled after schema migration.
        </p>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
        </div>
      </div>
    </div>
  )
}