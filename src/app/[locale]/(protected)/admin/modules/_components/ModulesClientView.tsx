"use client"

import { useState } from 'react'
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

const MODULE_LABELS: Record<string, string> = {
  pos: 'Point of Sale',
  inventory: 'Inventory',
  shifts: 'Shifts',
  admin: 'Admin',
}

export default function ModulesClientView({ modules }: ModulesClientViewProps) {
  const [moduleList, setModuleList] = useState(modules)

  const toggleModule = async (module: string, currentStatus: boolean) => {
    await setModuleStatusAction(module, !currentStatus)
    setModuleList(prev =>
      prev.map(m => m.module === module ? { ...m, isActive: !currentStatus } : m)
    )
  }

  return (
    <div className="space-y-4">
      {moduleList.map(({ module, isActive }) => (
        <div
          key={module}
          className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-medium text-on-surface">{MODULE_LABELS[module] ?? module}</h3>
              <p className="text-xs text-on-surface-variant">/{module}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isActive ? 'success' : 'neutral'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              size="sm"
              variant={isActive ? 'destructive' : 'success'}
              onClick={() => toggleModule(module, isActive)}
            >
              {isActive ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
