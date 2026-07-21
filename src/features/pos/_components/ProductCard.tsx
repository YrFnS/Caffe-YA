"use client"

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Product } from '../_types'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const price = Number(product.price)
  const imageSrc = product.localImageName?.startsWith('http') ? product.localImageName : `/uploads/products/${product.localImageName}`

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className={cn(
        'group relative flex flex-col items-start rounded-2xl border border-outline-variant/60 bg-white p-3 shadow-sm transition-all',
        'hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-lg active:scale-[0.98]',
        'text-start'
      )}
    >
      <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-surface-container-low">
        {product.localImageName ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-2xl text-on-surface-variant">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <h3 className="text-body-md font-medium text-on-surface mb-1 line-clamp-2">
        {product.name}
      </h3>

      <p className="text-label-md text-secondary font-semibold">
        {price.toLocaleString('en-US', { minimumFractionDigits: 0 })} IQD
      </p>

      <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-white shadow-md">
          <Plus className="w-4 h-4" />
        </span>
      </div>
    </button>
  )
}
