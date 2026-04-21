# Phase 3: Shift Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement shift open/close workflow with blind cash counting, variance tracking, manager approval, and shift history.

**Architecture:**
- Shift management as a new `features/shifts/` feature module following the existing pattern from Phase 2's `features/pos/`
- Route at `src/app/[locale]/(protected)/shifts/page.tsx` — serves as the shift dashboard (open/close/status + history)
- POS header extended to show shift duration timer and close-shift button
- `shifts/_services/shiftService.ts` handles all business logic (open, close, variance calc, active-resource check)
- `shifts/_actions/shiftActions.ts` holds thin Server Actions wrapping service calls
- `shifts/_components/` holds `OpenShiftModal`, `CloseShiftOverlay` (full-screen glassmorphism), `ShiftStatusBadge`, `ShiftHistoryTable`
- Variance threshold stored in `system_settings` table (key: `variance_threshold`, default: `50000` IQD)
- Manager approval: any user with `shifts.approve` permission can approve — no PIN system needed

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, next-intl, Tailwind CSS v4, glassmorphism overlays

---

## File Map

### New Feature Files
```
src/features/shifts/
├── _types.ts                        # ShiftViewState, OpenShiftInput, CloseShiftInput, ShiftSummary
├── _services/
│   └── shiftService.ts              # openShift, closeShift, getShiftHistory, getActiveShiftForUser, getCashSales, getCashExpenses, getActiveResources
├── _actions/
│   └── shiftActions.ts             # Server Actions: openShiftAction, closeShiftAction
├── _components/
│   ├── OpenShiftModal.tsx          # Modal: enter opening float amount
│   ├── CloseShiftOverlay.tsx       # Full-screen blind count overlay
│   ├── ShiftStatusCard.tsx         # Header card: cashier, duration, open/close button
│   ├── ActiveResourcesWarning.tsx  # Shown when blocking close due to running timers
│   └── ShiftHistoryTable.tsx       # Dense data table of past shifts
└── index.ts                        # Re-exports

src/app/[locale]/(protected)/shifts/
├── page.tsx                        # Server Component: auth check + data fetch + renders ShiftClientView
├── loading.tsx                     # Skeleton
├── error.tsx                       # Error boundary
└── _components/
    └── ShiftsClientView.tsx        # Client orchestrator: decides open vs. history view
```

### Modified Files
```
src/app/[locale]/(protected)/pos/_components/POSLayout.tsx   # Add shift duration timer + close button
src/app/[locale]/(protected)/pos/page.tsx                     # Add shift duration to props
src/app/[locale]/(protected)/pos/_components/POSClientView.tsx # Pass shift duration to POSLayout
src/messages/en.json                                          # Add shifts.* keys
src/messages/ar.json                                          # Add Arabic shifts.* keys
```

---

## Task Breakdown

### Task 1: Feature scaffolding + types + shiftService skeleton

**Files:**
- Create: `src/features/shifts/_types.ts`
- Create: `src/features/shifts/_services/shiftService.ts`
- Create: `src/features/shifts/index.ts`

**Step 1: Create `src/features/shifts/_types.ts`**

```typescript
export interface ShiftSummary {
  id: string
  cashierId: string
  cashierName: string
  status: 'open' | 'closed'
  openedAt: Date
  closedAt: Date | null
  openingFloat: string
  closingCountedCash: string | null
  closingExpectedCash: string | null
  cashVariance: string | null
  approvedBy: string | null
  notes: string | null
}

export interface OpenShiftInput {
  openingFloat: string  // numeric string, e.g. "150000.000"
}

export interface CloseShiftInput {
  shiftId: string
  countedCash: string  // what the cashier counted
  notes?: string
}

export interface ShiftViewState {
  activeShift: ShiftSummary | null
  history: ShiftSummary[]
  cashSales: string   // calculated: sum of cash transactions
  cashExpenses: string // calculated: sum of cash expenses
  expectedCash: string // calculated: openingFloat + cashSales - cashExpenses
  variance: string     // calculated: countedCash - expectedCash
  activeResources: Array<{ id: string; name: string; orderId: string }> // orders with running timers
}
```

**Step 2: Create `src/features/shifts/_services/shiftService.ts`**

Service functions (all async, use `db` from `@/lib/db`):

```typescript
import { db } from '@/lib/db'
import { shifts, transactions, expenses, orders, resources, users } from '@/lib/schema'
import { eq, and, desc } from 'drizzle-orm'

// Get active shift for a user (returns null if none)
export async function getActiveShiftForUser(userId: string) { ... }

// Get shift by ID with cashier name
export async function getShiftById(shiftId: string) { ... }

// Get shift history (last 30 shifts)
export async function getShiftHistory(limit = 30) { ... }

// Open a new shift
export async function openShift(userId: string, openingFloat: string) { ... }

// Close a shift with blind count
export async function closeShift(shiftId: string, userId: string, countedCash: string, approvedBy?: string, notes?: string) { ... }

// Calculate cash sales for a shift (transactions where paymentMethod = 'cash')
export async function getCashSales(shiftId: string): Promise<string> { ... }

// Calculate cash expenses for a shift
export async function getCashExpenses(shiftId: string): Promise<string> { ... }

// Get orders with running timers (timerStartedAt set, timerEndedAt null)
export async function getActiveResources(shiftId: string) { ... }
```

All functions use `numeric` columns — keep as strings, use `Number()` only for display math.

**Step 3: Create `src/features/shifts/index.ts`**

```typescript
export * from './_types'
export * from './_services/shiftService'
```

---

### Task 2: Server Actions

**Files:**
- Create: `src/features/shifts/_actions/shiftActions.ts`

**Step 1: Create `src/features/shifts/_actions/shiftActions.ts`**

```typescript
'use server'

import { openShift, closeShift } from '../_services/shiftService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function openShiftAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  
  const openingFloat = formData.get('openingFloat') as string
  if (!openingFloat || isNaN(Number(openingFloat))) {
    return { error: 'INVALID_FLOAT' }
  }
  
  try {
    const shift = await openShift(session.user.id as string, openingFloat)
    revalidatePath('/shifts')
    revalidatePath('/pos')
    return { success: true, shiftId: shift.id }
  } catch (e) {
    return { error: 'OPEN_SHIFT_FAILED' }
  }
}

export async function closeShiftAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  
  const shiftId = formData.get('shiftId') as string
  const countedCash = formData.get('countedCash') as string
  const approvedBy = formData.get('approvedBy') as string | null
  const notes = formData.get('notes') as string | undefined
  
  if (!shiftId || !countedCash || isNaN(Number(countedCash))) {
    return { error: 'INVALID_INPUT' }
  }
  
  try {
    await closeShift(shiftId, session.user.id as string, countedCash, approvedBy ?? undefined, notes)
    revalidatePath('/shifts')
    revalidatePath('/pos')
    return { success: true }
  } catch (e) {
    if (e instanceof Error && e.message === 'ACTIVE_RESOURCES') {
      return { error: 'ACTIVE_RESOURCES' }
    }
    return { error: 'CLOSE_SHIFT_FAILED' }
  }
}
```

---

### Task 3: Translation keys

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/ar.json`

**Step 1: Add shift translation keys to both files**

Add under root level `shifts` key:

```json
"shifts": {
  "title": "Shift Management",
  "openShift": "Open Shift",
  "closeShift": "Close Shift",
  "openingFloat": "Opening Float",
  "enterFloat": "Enter opening float amount",
  "floatPlaceholder": "e.g. 150000",
  "blindCountTitle": "Close Shift — Blind Count",
  "blindCountDesc": "Enter the total cash in the drawer. Expected amount will be revealed after submission.",
  "countedCash": "Counted Cash",
  "enterCountedCash": "Enter cash counted",
  "cashPlaceholder": "e.g. 450000",
  "confirmClose": "Confirm & Close",
  "expectedCash": "Expected Cash",
  "variance": "Variance",
  "varianceOver": "Over",
  "varianceShort": "Short",
  "varianceOk": "Balanced",
  "managerApprovalRequired": "Manager Approval Required",
  "managerApprovalDesc": "Variance exceeds threshold. A manager must approve to close.",
  "approveAndClose": "Approve & Close",
  "approvedBy": "Approved by",
  "noActiveShift": "No active shift",
  "shiftActive": "Shift Active",
  "shiftDuration": "Duration",
  "cashier": "Cashier",
  "openedAt": "Opened at",
  "closedAt": "Closed at",
  "history": "Shift History",
  "noHistory": "No past shifts",
  "viewDetails": "View details",
  "notes": "Notes",
  "activeResourcesWarning": "Active Timers Detected",
  "activeResourcesDesc": "The following resources have running timers. Stop or transfer them before closing the shift.",
  "stopTimer": "Stop Timer",
  "transferResource": "Transfer",
  "float": "Float",
  "openingFloat": "Opening Float"
}
```

Add `shiftHistory` key under `nav` if not present.

---

### Task 4: OpenShiftModal component

**Files:**
- Create: `src/features/shifts/_components/OpenShiftModal.tsx`

**Step 1: Create `OpenShiftModal.tsx`**

```typescript
"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { openShiftAction } from '../_actions/shiftActions'

interface OpenShiftModalProps {
  onSuccess?: () => void
}

export default function OpenShiftModal({ onSuccess }: OpenShiftModalProps) {
  const t = useTranslations('shifts')
  const [float, setFloat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const fd = new FormData()
    fd.set('openingFloat', float)
    
    const result = await openShiftAction(fd)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-container-highest/80 backdrop-blur-2xl" />
      
      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-headline-md font-semibold text-on-surface mb-2">
          {t('openShift')}
        </h2>
        <p className="text-body-md text-on-surface-variant mb-6">
          {t('enterFloat')}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">
              {t('openingFloat')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={float}
              onChange={(e) => setFloat(e.target.value)}
              placeholder={t('floatPlaceholder')}
              className="w-full h-14 px-4 bg-surface-container-highest rounded-lg text-body-lg text-on-surface
                outline-none focus:ring-2 focus:ring-outline placeholder:text-on-surface-disabled"
              required
            />
          </div>
          
          {error && (
            <p className="text-body-sm text-tertiary">{error}</p>
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 h-12 rounded-lg bg-surface-container-high text-on-surface font-medium"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !float}
              className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50"
            >
              {loading ? t('loading') : t('confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Use `t('cancel')` from `common` and `t('confirm')` from a new `common.confirm` or inline.

---

### Task 5: ActiveResourcesWarning component

**Files:**
- Create: `src/features/shifts/_components/ActiveResourcesWarning.tsx`

```typescript
"use client"

import { useTranslations } from 'next-intl'
import { Monitor, Clock } from 'lucide-react'

interface ActiveResource {
  id: string
  name: string
  orderId: string
}

interface ActiveResourcesWarningProps {
  resources: ActiveResource[]
  onStopTimer?: (resourceId: string, orderId: string) => void
  onTransfer?: (resourceId: string, orderId: string) => void
}

export default function ActiveResourcesWarning({ resources, onStopTimer, onTransfer }: ActiveResourcesWarningProps) {
  const t = useTranslations('shifts')
  
  if (resources.length === 0) return null

  return (
    <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-tertiary" />
        <h3 className="text-headline-sm font-semibold text-tertiary">
          {t('activeResourcesWarning')}
        </h3>
      </div>
      <p className="text-body-sm text-on-surface-variant mb-4">
        {t('activeResourcesDesc')}
      </p>
      <div className="space-y-2">
        {resources.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-surface-container-lowest rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-tertiary" />
              <span className="text-body-md font-medium text-on-surface">{r.name}</span>
            </div>
            <div className="flex gap-2">
              {onStopTimer && (
                <button
                  onClick={() => onStopTimer(r.id, r.orderId)}
                  className="text-label-md px-3 py-1.5 rounded-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/20"
                >
                  {t('stopTimer')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Task 6: CloseShiftOverlay component (glassmorphism)

**Files:**
- Create: `src/features/shifts/_components/CloseShiftOverlay.tsx`

**Step 1: Create `CloseShiftOverlay.tsx`**

```typescript
"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { closeShiftAction } from '../_actions/shiftActions'
import ActiveResourcesWarning from './ActiveResourcesWarning'

interface ActiveResource {
  id: string
  name: string
  orderId: string
}

interface CloseShiftOverlayProps {
  shiftId: string
  openingFloat: string
  cashSales: string
  cashExpenses: string
  activeResources: ActiveResource[]
  onClose?: () => void
  onSuccess?: () => void
}

export default function CloseShiftOverlay({
  shiftId,
  openingFloat,
  cashSales,
  cashExpenses,
  activeResources,
  onClose,
  onSuccess,
}: CloseShiftOverlayProps) {
  const t = useTranslations('shifts')
  const [countedCash, setCountedCash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showExpected, setShowExpected] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [approverId, setApproverId] = useState('')

  // Calculated expected: openingFloat + cashSales - cashExpenses
  const expected = (Number(openingFloat) + Number(cashSales) - Number(cashExpenses)).toFixed(3)
  const variance = showExpected ? (Number(countedCash) - Number(expected)).toFixed(3) : null
  const varianceNum = variance ? Number(variance) : 0
  const isOver = varianceNum > 0
  const isShort = varianceNum < 0

  // Threshold from system settings (default 50000)
  const VARIANCE_THRESHOLD = 50000
  const requiresApproval = showExpected && Math.abs(varianceNum) > VARIANCE_THRESHOLD

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showExpected) {
      // First submit: show expected after blind count entry
      setShowExpected(true)
      if (activeResources.length > 0) return  // block if active resources
      return
    }
    
    setLoading(true)
    setError('')
    
    const fd = new FormData()
    fd.set('shiftId', shiftId)
    fd.set('countedCash', countedCash)
    if (requiresApproval) fd.set('approvedBy', approverId)
    
    const result = await closeShiftAction(fd)
    if (result.error) {
      if (result.error === 'ACTIVE_RESOURCES') {
        setError('ACTIVE_RESOURCES')
      } else {
        setError(result.error)
      }
      setLoading(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Glassmorphism backdrop — per DESIGN.md restricted to: order summary, station cards, shift overlay */}
      <div className="absolute inset-0 bg-surface/60 backdrop-blur-xl" />
      
      <div className="relative bg-surface-container-lowest rounded-2xl p-8 w-full max-w-lg shadow-2xl">
        {!showExpected ? (
          // BLIND COUNT ENTRY — no expected shown
          <>
            <h2 className="text-headline-md font-semibold text-on-surface mb-1">
              {t('blindCountTitle')}
            </h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              {t('blindCountDesc')}
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeResources.length > 0 && (
                <ActiveResourcesWarning 
                  resources={activeResources}
                />
              )}
              
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  {t('countedCash')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder={t('cashPlaceholder')}
                  className="w-full h-14 px-4 bg-surface-container-highest rounded-lg text-body-lg text-on-surface
                    outline-none focus:ring-2 focus:ring-outline placeholder:text-on-surface-disabled text-end"
                  required
                />
              </div>
              
              {error === 'ACTIVE_RESOURCES' && (
                <p className="text-body-sm text-tertiary">{t('activeResourcesWarning')}</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-12 rounded-lg bg-surface-container-high text-on-surface font-medium"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !countedCash || activeResources.length > 0}
                  className="flex-1 h-12 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50"
                >
                  {loading ? t('processing') : t('confirmClose')}
                </button>
              </div>
            </form>
          </>
        ) : (
          // VARIANCE REVEAL — expected is now visible
          <>
            <h2 className="text-headline-md font-semibold text-on-surface mb-6">
              {t('variance')}
            </h2>
            
            {/* Expected + Variance cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-container-low rounded-xl p-4">
                <p className="text-label-sm text-on-surface-variant mb-1">{t('expectedCash')}</p>
                <p className="text-display-sm font-bold text-on-surface font-mono">
                  {Number(expected).toLocaleString()}
                </p>
              </div>
              <div className={`rounded-xl p-4 ${isOver ? 'bg-secondary/10' : isShort ? 'bg-tertiary/10' : 'bg-secondary/10'}`}>
                <p className="text-label-sm text-on-surface-variant mb-1">{t('variance')}</p>
                <p className={`text-display-sm font-bold font-mono ${
                  isOver ? 'text-secondary' : isShort ? 'text-tertiary' : 'text-secondary'
                }`}>
                  {isOver ? '+' : ''}{Number(variance).toLocaleString()}
                </p>
                <p className="text-label-sm mt-1">
                  {isOver ? t('varianceOver') : isShort ? t('varianceShort') : t('varianceOk')}
                </p>
              </div>
            </div>
            
            {requiresApproval && !needsApproval && (
              <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-body-sm text-warning">{t('managerApprovalRequired')}</p>
                <button
                  onClick={() => setNeedsApproval(true)}
                  className="mt-2 text-label-md text-warning underline"
                >
                  {t('approveAndClose')}
                </button>
              </div>
            )}
            
            {requiresApproval && needsApproval && (
              <div className="mb-4">
                <label className="block text-label-md text-on-surface-variant mb-1">
                  {t('approvedBy')}
                </label>
                <input
                  type="text"
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  placeholder="Manager ID"
                  className="w-full h-12 px-4 bg-surface-container-highest rounded-lg text-body-md"
                />
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && error !== 'ACTIVE_RESOURCES' && (
                <p className="text-body-sm text-tertiary">{error}</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpected(false)}
                  className="flex-1 h-12 rounded-lg bg-surface-container-high text-on-surface font-medium"
                >
                  {t('backToProducts')}
                </button>
                <button
                  type="submit"
                  disabled={loading || (requiresApproval && !approverId)}
                  className="flex-1 h-12 rounded-lg bg-tertiary text-on-primary font-medium disabled:opacity-50"
                >
                  {loading ? t('processing') : requiresApproval ? t('approveAndClose') : t('confirmClose')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
```

---

### Task 7: ShiftStatusCard component

**Files:**
- Create: `src/features/shifts/_components/ShiftStatusCard.tsx`

```typescript
"use client"

import { useTranslations } from 'next-intl'
import { Clock, User } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ShiftStatusCardProps {
  shiftId: string
  cashierName: string
  openedAt: Date
  onCloseShift: () => void
}

function useShiftDuration(openedAt: Date) {
  const [duration, setDuration] = useState('')
  
  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(openedAt).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [openedAt])
  
  return duration
}

export default function ShiftStatusCard({ shiftId, cashierName, openedAt, onCloseShift }: ShiftStatusCardProps) {
  const t = useTranslations('shifts')
  const tNav = useTranslations('nav')
  const duration = useShiftDuration(openedAt)

  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div>
          <p className="text-label-sm text-on-surface-variant mb-0.5">{t('cashier')}</p>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-on-surface-variant" />
            <span className="text-body-lg font-semibold text-on-surface">{cashierName}</span>
          </div>
        </div>
        <div className="w-px h-10 bg-outline-variant/15" />
        <div>
          <p className="text-label-sm text-on-surface-variant mb-0.5">{t('openedAt')}</p>
          <p className="text-body-lg font-medium text-on-surface">
            {new Date(openedAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="w-px h-10 bg-outline-variant/15" />
        <div>
          <p className="text-label-sm text-on-surface-variant mb-0.5">{t('shiftDuration')}</p>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-display-sm font-bold font-mono text-secondary">
              {duration}
            </span>
          </div>
        </div>
      </div>
      
      <button
        onClick={onCloseShift}
        className="h-12 px-6 rounded-lg bg-tertiary text-on-primary font-medium"
      >
        {t('closeShift')}
      </button>
    </div>
  )
}
```

---

### Task 8: ShiftHistoryTable component

**Files:**
- Create: `src/features/shifts/_components/ShiftHistoryTable.tsx`

```typescript
"use client"

import { useTranslations } from 'next-intl'
import type { ShiftSummary } from '../_types'

interface ShiftHistoryTableProps {
  history: ShiftSummary[]
}

export default function ShiftHistoryTable({ history }: ShiftHistoryTableProps) {
  const t = useTranslations('shifts')

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body-lg text-on-surface-variant">{t('noHistory')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-container-low">
            <th className="text-start px-4 py-3 text-label-md text-on-surface-variant">{t('cashier')}</th>
            <th className="text-start px-4 py-3 text-label-md text-on-surface-variant">{t('openedAt')}</th>
            <th className="text-start px-4 py-3 text-label-md text-on-surface-variant">{t('closedAt')}</th>
            <th className="text-end px-4 py-3 text-label-md text-on-surface-variant">{t('float')}</th>
            <th className="text-end px-4 py-3 text-label-md text-on-surface-variant">{t('expectedCash')}</th>
            <th className="text-end px-4 py-3 text-label-md text-on-surface-variant">{t('variance')}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((shift) => {
            const variance = shift.cashVariance ? Number(shift.cashVariance) : 0
            const isOver = variance > 0
            const isShort = variance < 0
            return (
              <tr 
                key={shift.id}
                className="border-b border-outline-variant/15 hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <td className="px-4 py-3.5 text-body-md text-on-surface">{shift.cashierName}</td>
                <td className="px-4 py-3.5 text-body-md text-on-surface">
                  {new Date(shift.openedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-body-md text-on-surface">
                  {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3.5 text-body-md text-end text-on-surface font-mono">
                  {Number(shift.openingFloat).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-body-md text-end text-on-surface font-mono">
                  {shift.closingExpectedCash ? Number(shift.closingExpectedCash).toLocaleString() : '—'}
                </td>
                <td className={`px-4 py-3.5 text-body-md text-end font-mono font-semibold ${
                  isOver ? 'text-secondary' : isShort ? 'text-tertiary' : 'text-secondary'
                }`}>
                  {shift.cashVariance !== null
                    ? `${isOver ? '+' : ''}${variance.toLocaleString()}`
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

---

### Task 9: ShiftsClientView + page route

**Files:**
- Create: `src/app/[locale]/(protected)/shifts/_components/ShiftsClientView.tsx`
- Create: `src/app/[locale]/(protected)/shifts/page.tsx`
- Create: `src/app/[locale]/(protected)/shifts/loading.tsx`
- Create: `src/app/[locale]/(protected)/shifts/error.tsx`

**Step 1: Create `src/app/[locale]/(protected)/shifts/_components/ShiftsClientView.tsx`**

```typescript
"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import OpenShiftModal from '@/features/shifts/_components/OpenShiftModal'
import CloseShiftOverlay from '@/features/shifts/_components/CloseShiftOverlay'
import ShiftStatusCard from '@/features/shifts/_components/ShiftStatusCard'
import ShiftHistoryTable from '@/features/shifts/_components/ShiftHistoryTable'
import type { ShiftSummary } from '@/features/shifts/_types'

interface ShiftsClientViewProps {
  activeShift: ShiftSummary | null
  history: ShiftSummary[]
  cashierName: string
}

export default function ShiftsClientView({ activeShift, history, cashierName }: ShiftsClientViewProps) {
  const t = useTranslations('shifts')
  const [showOpenModal, setShowOpenModal] = useState(!activeShift)
  const [showCloseOverlay, setShowCloseOverlay] = useState(false)

  const handleShiftOpened = () => {
    setShowOpenModal(false)
    window.location.reload() // simplest: reload to get fresh data with new shift
  }

  const handleShiftClosed = () => {
    setShowCloseOverlay(false)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('title')}</h1>
        {!activeShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="h-12 px-6 rounded-lg bg-primary text-on-primary font-medium"
          >
            {t('openShift')}
          </button>
        )}
      </div>

      {/* Active shift status card */}
      {activeShift && (
        <ShiftStatusCard
          shiftId={activeShift.id}
          cashierName={cashierName}
          openedAt={new Date(activeShift.openedAt)}
          onCloseShift={() => setShowCloseOverlay(true)}
        />
      )}

      {/* Shift history */}
      <div>
        <h2 className="text-headline-sm font-semibold text-on-surface mb-4">{t('history')}</h2>
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
          <ShiftHistoryTable history={history} />
        </div>
      </div>

      {/* Modals */}
      {showOpenModal && <OpenShiftModal onSuccess={handleShiftOpened} />}
      {showCloseOverlay && activeShift && (
        <CloseShiftOverlay
          shiftId={activeShift.id}
          openingFloat={activeShift.openingFloat}
          cashSales="0"  // fetched server-side in page
          cashExpenses="0"
          activeResources={[]}
          onClose={() => setShowCloseOverlay(false)}
          onSuccess={handleShiftClosed}
        />
      )}
    </div>
  )
}
```

**Step 2: Create `src/app/[locale]/(protected)/shifts/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getActiveShiftForUser, getShiftHistory, getCashSales, getCashExpenses, getActiveResources } from '@/features/shifts/_services/shiftService'
import ShiftsClientView from './_components/ShiftsClientView'

export default async function ShiftsPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const userId = session.user.id as string
  const activeShift = await getActiveShiftForUser(userId)
  const history = await getShiftHistory()

  // Pre-calculate cash data for close overlay (if active shift)
  let cashSales = '0'
  let cashExpenses = '0'
  let activeResources: Array<{ id: string; name: string; orderId: string }> = []

  if (activeShift) {
    cashSales = await getCashSales(activeShift.id)
    cashExpenses = await getCashExpenses(activeShift.id)
    activeResources = await getActiveResources(activeShift.id)
  }

  return (
    <ShiftsClientView
      activeShift={activeShift}
      history={history}
      cashierName={session.user.name || 'Cashier'}
    />
  )
}
```

**Step 3: Create `loading.tsx` and `error.tsx`**

```typescript
// loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-surface-container-low rounded-lg" />
      <div className="h-24 bg-surface-container-low rounded-xl" />
      <div className="h-64 bg-surface-container-low rounded-xl" />
    </div>
  )
}

// error.tsx
"use client"
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-body-lg text-tertiary mb-4">Something went wrong</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-on-primary rounded-lg">
        Retry
      </button>
    </div>
  )
}
```

---

### Task 10: Update POS header with shift duration + close button

**Files:**
- Modify: `src/app/[locale]/(protected)/pos/_components/POSLayout.tsx`
- Modify: `src/app/[locale]/(protected)/pos/page.tsx`
- Modify: `src/app/[locale]/(protected)/pos/_components/POSClientView.tsx`

**Step 1: Update `POSLayout.tsx`**

Add shift duration display and close-shift button in header:

```typescript
// Add to header (after shiftStatus badge):
{shiftId && shiftOpenedAt && (
  <>
    <div className="w-px h-6 bg-outline-variant/15" />
    <ShiftDurationDisplay openedAt={shiftOpenedAt} />
    <button
      onClick={() => window.location.href = `/${locale}/shifts`}
      className="h-9 px-4 rounded-lg bg-tertiary/10 text-tertiary text-label-md hover:bg-tertiary/20"
    >
      {t('closeShift')}
    </button>
  </>
)}
```

Add new `ShiftDurationDisplay` client component:

```typescript
// New file: POSLayout.tsx imports + new inner component
function ShiftDurationDisplay({ openedAt }: { openedAt: Date }) {
  const [duration, setDuration] = useState('')
  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(openedAt).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDuration(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [openedAt])
  
  return <span className="font-mono text-label-md text-on-surface-variant">{duration}</span>
}
```

**Step 2: Update `pos/page.tsx`** — pass `openedAt` to `POSClientView`:

```typescript
return (
  <POSClientView
    ...
    shiftOpenedAt={activeShift.openedAt}
  />
)
```

**Step 3: Update `POSClientView.tsx`** — accept and forward `shiftOpenedAt`:

```typescript
interface POSClientViewProps {
  ...
  shiftOpenedAt?: Date
}
```

---

### Task 11: Add shiftService implementations

**Step 1: Implement all functions in `shiftService.ts`**

Key implementation notes:

```typescript
// getActiveShiftForUser
export async function getActiveShiftForUser(userId: string) {
  const result = await db.query.shifts.findFirst({
    where: and(eq(shifts.cashierId, userId), eq(shifts.status, 'open')),
    with: { cashier: { columns: { name: true } } }
  })
  if (!result) return null
  return {
    ...result,
    cashierName: result.cashier?.name || 'Unknown',
  }
}

// openShift
export async function openShift(userId: string, openingFloat: string) {
  // Check no existing open shift
  const existing = await getActiveShiftForUser(userId)
  if (existing) throw new Error('SHIFT_ALREADY_OPEN')
  
  const [shift] = await db.insert(shifts).values({
    cashierId: userId,
    openingFloat,
    status: 'open',
  }).returning()
  
  return shift
}

// closeShift
export async function closeShift(shiftId: string, userId: string, countedCash: string, approvedBy?: string, notes?: string) {
  // 1. Check active resources
  const active = await getActiveResources(shiftId)
  if (active.length > 0) throw new Error('ACTIVE_RESOURCES')
  
  // 2. Calculate expected
  const cashSales = await getCashSales(shiftId)
  const cashExpenses = await getCashExpenses(shiftId)
  const shift = await getShiftById(shiftId)
  
  const expected = (Number(shift.openingFloat) + Number(cashSales) - Number(cashExpenses)).toFixed(3)
  const variance = (Number(countedCash) - Number(expected)).toFixed(3)
  
  await db.update(shifts)
    .set({
      status: 'closed',
      closedAt: new Date(),
      closingCountedCash: countedCash,
      closingExpectedCash: expected,
      cashVariance: variance,
      approvedBy: approvedBy ?? null,
      notes: notes ?? null,
    })
    .where(eq(shifts.id, shiftId))
}

// getCashSales
export async function getCashSales(shiftId: string): Promise<string> {
  const txs = await db.query.transactions.findMany({
    where: and(eq(transactions.shiftId, shiftId), eq(transactions.paymentMethod, 'cash'), eq(transactions.isRefund, false))
  })
  const total = txs.reduce((sum, tx) => sum + Number(tx.amount), 0)
  return total.toFixed(3)
}

// getCashExpenses
export async function getCashExpenses(shiftId: string): Promise<string> {
  const exps = await db.query.expenses.findMany({
    where: eq(expenses.shiftId, shiftId)
  })
  const total = exps.reduce((sum, e) => sum + Number(e.amount), 0)
  return total.toFixed(3)
}

// getActiveResources — orders with running timers (timerStartedAt set, timerEndedAt null)
export async function getActiveResources(shiftId: string) {
  return db.query.orders.findMany({
    where: and(
      eq(orders.shiftId, shiftId),
      eq(orders.status, 'occupied'),  // orders that are still active (not closed)
      isNull(orders.timerEndedAt),
    ),
    with: { resource: { columns: { id: true, name: true } } }
  })
}

// getShiftHistory
export async function getShiftHistory(limit = 30) {
  const results = await db.query.shifts.findMany({
    where: eq(shifts.status, 'closed'),
    orderBy: [desc(shifts.closedAt)],
    limit,
    with: { cashier: { columns: { name: true } } }
  })
  return results.map(r => ({ ...r, cashierName: r.cashier?.name || 'Unknown' }))
}
```

---

### Task 12: Build verification

**Step 1: Run lint**

```bash
npm run lint
```

**Step 2: Run build**

```bash
npm run build
```

**Step 3: Verify diagnostics on new files**

```bash
lsp_diagnostics on src/features/shifts/
```

---

## Success Criteria

- [ ] `npm run build` passes with zero type errors
- [ ] `npm run lint` passes with zero warnings
- [ ] POS header shows shift duration and "Close Shift" button when shift is open
- [ ] `/shifts` redirects to open-shift modal when no shift is active
- [ ] `/shifts` shows shift status card when shift is open
- [ ] Close shift shows blind count entry (expected amount NOT visible until after count)
- [ ] After blind count submit, expected + variance revealed with color coding
- [ ] Cannot close shift if active resources exist (blocks with warning)
- [ ] Manager approval required for large variances (threshold: 50,000 IQD)
- [ ] Shift history table shows last 30 closed shifts
- [ ] All UI text is bilingual (EN + AR) via next-intl
- [ ] RTL works correctly on all shift screens
