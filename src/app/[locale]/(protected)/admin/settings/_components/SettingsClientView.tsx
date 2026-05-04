"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setSettingAction } from '@/features/admin/_actions/adminActions'

interface SettingsClientViewProps {
  settings: Record<string, unknown>
}

const SETTING_FIELDS = [
  { key: 'shop_name', label: 'Shop Name', type: 'text' },
  { key: 'currency', label: 'Currency Code', type: 'text' },
  { key: 'currency_rounding', label: 'Currency Rounding', type: 'text' },
  { key: 'petty_cash_limit', label: 'Petty Cash Limit', type: 'text' },
]

export default function SettingsClientView({ settings }: SettingsClientViewProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of SETTING_FIELDS) {
      const val = settings[field.key]
      initial[field.key] = typeof val === 'string' ? val : JSON.stringify(val ?? '')
    }
    return initial
  })
  const [saving, setSaving] = useState<string | null>(null)

  const handleSave = async (key: string) => {
    setSaving(key)
    const raw = values[key]
    let parsed: unknown = raw
    try { parsed = JSON.parse(raw) } catch { /* keep string */ }
    await setSettingAction(key, parsed)
    setSaving(null)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {SETTING_FIELDS.map(field => (
        <div key={field.key} className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label={field.label}
              value={values[field.key] ?? ''}
              onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
          <Button
            size="sm"
            onClick={() => handleSave(field.key)}
            disabled={saving === field.key}
          >
            {saving === field.key ? 'Saving...' : 'Save'}
          </Button>
        </div>
      ))}
    </div>
  )
}
