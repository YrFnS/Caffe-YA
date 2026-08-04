"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { setModuleStatusAction } from '@/features/admin/_actions/adminActions'

interface ModuleRow {
  module: string
  isActive: boolean
}

interface ModulesClientViewProps {
  modules: ModuleRow[]
}

export default function ModulesClientView({ modules }: ModulesClientViewProps) {
  const tAdmin = useTranslations('admin')
  const tNav = useTranslations('nav')
  const [moduleList, setModuleList] = useState(modules)
  const [updatingModule, setUpdatingModule] = useState<string | null>(null)
  const [error, setError] = useState('')

  const toggleModule = async (module: string, currentStatus: boolean) => {
    if (module === 'admin') return

    setUpdatingModule(module)
    setError('')
    try {
      const result = await setModuleStatusAction(module, !currentStatus)
      if (result.error) {
        setError(result.error)
        return
      }
      setModuleList(prev =>
        prev.map(m => m.module === module ? { ...m, isActive: !currentStatus } : m)
      )
    } finally {
      setUpdatingModule(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {moduleList.map(({ module, isActive }) => {
        const isCore = module === 'admin'
        const label = module in { dashboard: true, pos: true, resources: true, shifts: true, inventory: true, procurement: true, expenses: true, employees: true, payroll: true, accounting: true, partners: true, admin: true, reports: true }
          ? tNav(module as 'dashboard' | 'pos' | 'resources' | 'shifts' | 'inventory' | 'procurement' | 'expenses' | 'employees' | 'payroll' | 'accounting' | 'partners' | 'admin' | 'reports')
          : module

        return (
          <div
            key={module}
            className="flex flex-col gap-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 className="text-sm font-medium text-on-surface">{label}</h3>
              <p className="text-xs text-on-surface-variant">/{module}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? 'success' : 'neutral'}>
                {isActive ? tAdmin('active') : tAdmin('inactive')}
              </Badge>
              {!isCore && (
                <Button
                  size="sm"
                  variant={isActive ? 'destructive' : 'success'}
                  disabled={updatingModule === module}
                  onClick={() => toggleModule(module, isActive)}
                >
                  {isActive ? tAdmin('disable') : tAdmin('enable')}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
