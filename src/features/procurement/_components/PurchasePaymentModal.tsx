'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'
import { markPurchasePaidAction } from '../_actions/procurementActions'
import type { PurchaseRow } from '../_types'
import type { PurchasePaymentAccount } from '../_services/purchaseService'

interface PurchasePaymentModalProps {
  purchase: PurchaseRow
  accounts: PurchasePaymentAccount[]
  onClose: () => void
  onSuccess: () => void
}

export default function PurchasePaymentModal({ purchase, accounts, onClose, onSuccess }: PurchasePaymentModalProps) {
  const t = useTranslations('procurement')
  const locale = useLocale()
  const [accountCode, setAccountCode] = useState(accounts[0]?.code ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const copy = locale === 'ar'
    ? {
        title: 'تسجيل دفعة الشراء',
        account: 'حساب الدفع',
        help: 'سيتم خصم المبلغ من الحساب المحدد وتسوية الحسابات الدائنة.',
        required: 'اختر حساب دفع صالحاً.',
        alreadyPaid: 'تم تسجيل دفع هذا الشراء مسبقاً.',
        invalidAccount: 'حساب الدفع غير صالح أو غير نشط.',
        close: 'إغلاق',
      }
    : {
        title: 'Record purchase payment',
        account: 'Payment account',
        help: 'The selected account will be credited and Accounts Payable will be settled.',
        required: 'Choose a valid payment account.',
        alreadyPaid: 'This purchase has already been paid.',
        invalidAccount: 'The payment account is invalid or inactive.',
        close: 'Close',
      }

  async function submit() {
    if (!accountCode) {
      setError(copy.required)
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await markPurchasePaidAction(purchase.id, accountCode)
      if (result.error) {
        if (result.error === 'PURCHASE_ALREADY_PAID') setError(copy.alreadyPaid)
        else if (result.error === 'INVALID_PAYMENT_ACCOUNT') setError(copy.invalidAccount)
        else if (result.error === 'RECEIVE_BEFORE_PAYMENT') setError(t('receiveBeforePayment'))
        else setError(t('operationFailed'))
        return
      }
      onSuccess()
    } catch (actionError) {
      console.error('Purchase payment failed:', actionError)
      setError(t('operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={copy.title}
      closeLabel={copy.close}
      busy={loading}
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t('cancel')}</Button>
          <Button onClick={submit} disabled={loading || !accounts.length}>
            {loading ? t('saving') : t('markPaid')}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {error && <div role="alert" className="rounded-xl bg-error/10 p-3 text-sm text-error">{error}</div>}
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant">{purchase.vendorName ?? '—'}</p>
          <p className="mt-1 font-mono text-2xl font-bold text-on-surface">
            {formatCurrency(purchase.totalAmount)} IQD
          </p>
        </div>
        <p className="text-sm text-on-surface-variant">{copy.help}</p>
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {copy.account}
          <select
            value={accountCode}
            onChange={event => setAccountCode(event.target.value)}
            className="min-h-12 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface"
          >
            {!accounts.length && <option value="">{copy.required}</option>}
            {accounts.map(account => (
              <option key={account.code} value={account.code}>
                {account.code} · {locale === 'ar' ? account.nameAr || account.name : account.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  )
}
