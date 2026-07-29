"use client"

import { useLocale } from 'next-intl'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '../_types'
import { formatCurrency } from '@/lib/currency'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const locale = useLocale()
  const displayName = locale === 'ar' ? product.nameAr || product.name : product.name
  const imageSrc = product.localImageName?.startsWith('http')
    ? product.localImageName
    : `/uploads/products/${product.localImageName}`

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className={cn(
        'group relative flex min-h-52 flex-col items-start rounded-2xl bg-surface-container-lowest p-3 text-start shadow-[0_8px_28px_rgba(24,34,48,.06)] transition-all',
        'hover:-translate-y-0.5 hover:bg-surface-container-low hover:shadow-[0_14px_34px_rgba(24,34,48,.1)] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/20'
      )}
    >
      <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-container-low">
        {product.localImageName ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={displayName}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="font-display text-3xl font-bold text-on-surface-variant">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <h3 className="mb-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-on-surface">
        {displayName}
      </h3>

      <div className="mt-auto flex w-full items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-secondary">
          {formatCurrency(product.price)} IQD
        </p>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-white shadow-md" aria-hidden="true">
          <Plus className="h-5 w-5" />
        </span>
      </div>
    </button>
  )
}
