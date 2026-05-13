'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { deleteVendorAction } from '../_actions/procurementActions'
import type { VendorRow } from '../_types'
import VendorModal from './VendorModal'

interface VendorsListProps {
  vendors: VendorRow[]
}

export default function VendorsList({ vendors }: VendorsListProps) {
  const t = useTranslations('procurement')
  const [showModal, setShowModal] = useState(false)
  const [editVendor, setEditVendor] = useState<VendorRow | null>(null)

  async function handleDelete(id: string) {
    if (confirm(t('confirmDelete'))) {
      await deleteVendorAction(id)
      window.location.reload()
    }
  }

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant text-body-sm text-on-surface-variant">
                <th className="text-start p-3">{t('name')}</th>
                <th className="text-start p-3">{t('phone')}</th>
                <th className="text-start p-3">{t('address')}</th>
                <th className="text-start p-3">{t('status')}</th>
                <th className="text-start p-3">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">{t('noVendors')}</td></tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} className="border-b border-outline-variant hover:bg-surface-container-hover">
                  <td className="p-3 text-on-surface font-medium">{v.name}</td>
                  <td className="p-3 text-on-surface text-body-sm">{v.phone ?? '—'}</td>
                  <td className="p-3 text-on-surface text-body-sm">{v.address ?? '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-body-sm ${v.isActive ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                      {v.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditVendor(v); setShowModal(true) }} className="text-primary text-body-sm hover:underline">{t('edit')}</button>
                      <button onClick={() => handleDelete(v.id)} className="text-error text-body-sm hover:underline">{t('delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && <VendorModal vendor={editVendor} onSuccess={() => window.location.reload()} onClose={() => setShowModal(false)} />}
    </>
  )
}