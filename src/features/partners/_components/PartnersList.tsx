'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createPartnerAction, addCapitalInjectionAction, addDrawAction, addProfitDistributionAction } from '../_actions/partnerActions'
import type { PartnerRow, PartnerDashboard } from '../_types'

interface PartnersListProps {
  partners: PartnerRow[]
  dashboards: Record<string, PartnerDashboard>
}

export default function PartnersList({ partners, dashboards }: PartnersListProps) {
  const t = useTranslations('partners')
  const [showAdd, setShowAdd] = useState(false)
  const [userId, setUserId] = useState('')
  const [ownershipPercent, setOwnershipPercent] = useState('')
  const [showEvent, setShowEvent] = useState<string | null>(null)
  const [eventType, setEventType] = useState<'capital_injection' | 'draw' | 'profit_allocation'>('capital_injection')
  const [eventAmount, setEventAmount] = useState('')
  const [eventNote, setEventNote] = useState('')

  async function handleAdd() {
    await createPartnerAction({ userId, ownershipPercent })
    window.location.reload()
  }

  async function handleAddEvent(partnerId: string) {
    if (eventType === 'capital_injection') await addCapitalInjectionAction({ partnerId, amount: eventAmount, note: eventNote })
    else if (eventType === 'draw') await addDrawAction({ partnerId, amount: eventAmount, note: eventNote })
    else await addProfitDistributionAction({ partnerId, amount: eventAmount, note: eventNote })
    window.location.reload()
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">
          {t('addPartner')}
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {partners.map(p => {
          const dash = dashboards[p.id]
          return (
            <div key={p.id} className="bg-surface-container-lowest rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-title-medium font-semibold text-on-surface">{p.userId}</h3>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-body-sm font-medium">{p.ownershipPercent}%</span>
              </div>
              {dash ? (
                <div className="space-y-2 text-body-sm">
                  <div className="flex justify-between"><span className="text-on-surface-variant">{t('currentEquity')}</span><span className="font-medium text-on-surface">{dash.currentEquity}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">{t('totalInjected')}</span><span className="text-on-surface">{dash.totalCapitalInjected}</span></div>
                  <div className="flex justify-between"><span className="text-on-surface-variant">{t('totalDistributions')}</span><span className="text-on-surface">{dash.totalDistributions}</span></div>
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant">{t('noEquityData')}</p>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowEvent(p.id); setEventType('capital_injection') }} className="flex-1 px-3 py-1.5 rounded-lg border border-outline text-on-surface text-body-sm hover:bg-surface-container-hover">{t('inject')}</button>
                <button onClick={() => { setShowEvent(p.id); setEventType('draw') }} className="flex-1 px-3 py-1.5 rounded-lg border border-outline text-on-surface text-body-sm hover:bg-surface-container-hover">{t('draw')}</button>
                <button onClick={() => { setShowEvent(p.id); setEventType('profit_allocation') }} className="flex-1 px-3 py-1.5 rounded-lg border border-outline text-on-surface text-body-sm hover:bg-surface-container-hover">{t('distribute')}</button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-headline-sm font-semibold mb-4">{t('addPartner')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('userId')}</label>
                <input value={userId} onChange={e => setUserId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('ownershipPercent')}</label>
                <input type="number" value={ownershipPercent} onChange={e => setOwnershipPercent(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" step="0.01" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
                <button onClick={handleAdd} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-container-high rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-headline-sm font-semibold mb-4">{t('addEvent')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('type')}</label>
                <select value={eventType} onChange={e => setEventType(e.target.value as typeof eventType)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface">
                  <option value="capital_injection">{t('capitalInjection')}</option>
                  <option value="draw">{t('draw')}</option>
                  <option value="profit_allocation">{t('profitAllocation')}</option>
                </select>
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('amount')}</label>
                <input type="number" value={eventAmount} onChange={e => setEventAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" step="0.001" />
              </div>
              <div>
                <label className="block text-body-sm text-on-surface-variant mb-1">{t('note')}</label>
                <input value={eventNote} onChange={e => setEventNote(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-outline bg-surface-container-lowest text-on-surface" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEvent(null)} className="flex-1 px-4 py-2 rounded-lg border border-outline text-on-surface">{t('cancel')}</button>
                <button onClick={() => handleAddEvent(showEvent)} className="flex-1 px-4 py-2 rounded-lg bg-primary text-on-primary font-medium">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
