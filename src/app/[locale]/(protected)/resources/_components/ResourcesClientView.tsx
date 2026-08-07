"use client"

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Clock, Monitor, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRouter } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { assignAvailableResourceAction } from '@/features/pos/_actions/resource'
import { useTimer } from '@/features/pos/_hooks/useTimer'
import type { ResourceCategory, ResourceOperationsView } from '@/features/pos/_types'
import { formatCurrency } from '@/lib/currency'
import { resolveImageSource } from '@/lib/image'

interface ResourcesClientViewProps {
  resources: ResourceOperationsView[]
  categories: ResourceCategory[]
  currentUserId: string
}

interface ResourceOperationsCardProps {
  resource: ResourceOperationsView
  currentUserId: string
  pending: boolean
  onAssign: (resourceId: string) => void
  onOpenOrder: (orderId: string) => void
}

function ResourceOperationsCard({
  resource,
  currentUserId,
  pending,
  onAssign,
  onOpenOrder,
}: ResourceOperationsCardProps) {
  const t = useTranslations('resources')
  const tPos = useTranslations('pos')
  const tShifts = useTranslations('shifts')
  const activeOrder = resource.activeOrder
  const isOwnOrder = activeOrder?.cashierId === currentUserId
  const timerRunning = Boolean(activeOrder?.timerStartedAt && !activeOrder.timerEndedAt)
  const { display: timerDisplay } = useTimer({
    startedAt: activeOrder?.timerStartedAt ?? null,
    isRunning: timerRunning,
  })
  const imageSrc = resolveImageSource(resource.localImageName, 'resources')

  const statusStyles = {
    available: 'border-s-secondary bg-surface-container-lowest',
    occupied: 'border-s-tertiary bg-surface-container-lowest',
    maintenance: 'border-s-tertiary-fixed-dim bg-surface-container-low',
  }
  const statusBadgeStyles = {
    available: 'bg-secondary/10 text-secondary',
    occupied: 'bg-tertiary/10 text-tertiary',
    maintenance: 'bg-surface-container-high text-on-surface-variant',
  }

  return (
    <article className={cn(
      'flex min-h-72 flex-col overflow-hidden rounded-2xl border-s-4 p-4 shadow-[0_8px_28px_rgba(24,34,48,.06)]',
      statusStyles[resource.status],
    )}>
      {imageSrc && (
        <div className="-mx-4 -mt-4 mb-4 h-32 overflow-hidden bg-surface-container-low">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={resource.name} width={1000} height={700} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-container-low">
          <Monitor className={cn(
            'h-6 w-6',
            resource.status === 'available' ? 'text-secondary' : 'text-on-surface-variant',
          )} />
        </div>
        <span className={cn(
          'inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold',
          statusBadgeStyles[resource.status],
        )}>
          {resource.status === 'available' && t('available')}
          {resource.status === 'occupied' && t('occupied')}
          {resource.status === 'maintenance' && t('maintenance')}
        </span>
      </div>

      <h3 className="mt-4 font-display text-lg font-semibold text-on-surface">{resource.name}</h3>
      <p className="mt-1 text-sm text-on-surface-variant">{resource.category?.name ?? '—'}</p>

      {resource.category?.isTimed && resource.category.hourlyRate && (
        <p className="mt-3 font-mono text-sm font-semibold text-secondary">
          {formatCurrency(resource.category.hourlyRate)} IQD / 60m
        </p>
      )}

      {activeOrder && (
        <div className="mt-4 space-y-2 rounded-xl bg-surface-container-low p-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-on-surface-variant">
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="truncate">{tShifts('cashier')}</span>
            </span>
            <span className="truncate font-semibold text-on-surface">{activeOrder.cashierName}</span>
          </div>
          {timerRunning && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-on-surface-variant">
                <Clock className="h-4 w-4" /> {tPos('timer')}
              </span>
              <span className="font-mono font-bold tabular-nums text-warning">{timerDisplay}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-on-surface-variant">{tPos('total')}</span>
            <span className="font-mono font-bold text-on-surface">{formatCurrency(activeOrder.totalAmount)} IQD</span>
          </div>
        </div>
      )}

      <div className="mt-auto pt-4">
        {resource.status === 'available' && (
          <Button
            variant="success"
            className="w-full"
            onClick={() => onAssign(resource.id)}
            disabled={pending}
          >
            {pending ? t('loading') : t('assign')}
          </Button>
        )}
        {resource.status === 'occupied' && activeOrder && isOwnOrder && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onOpenOrder(activeOrder.id)}
            disabled={pending}
          >
            {tPos('currentOrder')}
          </Button>
        )}
      </div>
    </article>
  )
}

export default function ResourcesClientView({
  resources,
  categories,
  currentUserId,
}: ResourcesClientViewProps) {
  const t = useTranslations('resources')
  const common = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [pendingResourceId, setPendingResourceId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const filtered = selectedCategoryId
    ? resources.filter(resource => resource.categoryId === selectedCategoryId)
    : resources

  const handleAssign = async (resourceId: string) => {
    setPendingResourceId(resourceId)
    setError('')
    try {
      const result = await assignAvailableResourceAction(resourceId)
      if (result.error || !result.orderId) {
        setError(common('error_description'))
        return
      }
      router.push(`/pos?orderId=${encodeURIComponent(result.orderId)}`)
    } catch (actionError) {
      console.error('Resource assignment failed:', actionError)
      setError(common('error_description'))
    } finally {
      setPendingResourceId(null)
    }
  }

  const handleOpenOrder = (orderId: string) => {
    router.push(`/pos?orderId=${encodeURIComponent(orderId)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">{t('title')}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t('description')}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t('title')}>
        <Button
          role="tab"
          aria-selected={selectedCategoryId === null}
          variant={selectedCategoryId === null ? 'secondary' : 'ghost'}
          onClick={() => setSelectedCategoryId(null)}
        >
          {t('all')}
        </Button>
        {categories.map(category => (
          <Button
            role="tab"
            aria-selected={selectedCategoryId === category.id}
            key={category.id}
            variant={selectedCategoryId === category.id ? 'secondary' : 'ghost'}
            onClick={() => setSelectedCategoryId(category.id)}
          >
            <span dir={locale === 'ar' ? 'rtl' : 'ltr'}>{category.name}</span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Monitor} title={t('noResources')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map(resource => (
            <ResourceOperationsCard
              key={resource.id}
              resource={resource}
              currentUserId={currentUserId}
              pending={pendingResourceId === resource.id}
              onAssign={handleAssign}
              onOpenOrder={handleOpenOrder}
            />
          ))}
        </div>
      )}
    </div>
  )
}
