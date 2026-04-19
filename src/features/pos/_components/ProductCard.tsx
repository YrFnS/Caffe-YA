"use client"

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Product } from '../_types'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
}

export default function ProductCard({ product, onAdd }: ProductCardProps) {
  const price = Number(product.price)

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className={cn(
        'group relative flex flex-col items-start p-4 rounded-lg',
        'bg-surface-container-lowest transition-colors',
        'hover:bg-surface-container-high active:scale-[0.98]',
        'text-start'
      )}
    >
      <div className="w-full aspect-square mb-3 rounded-md bg-surface-container-low flex items-center justify-center">
        {product.localImageName ? (
          <img
            src={`/uploads/products/${product.localImageName}`}
            alt={product.name}
            className="w-full h-full object-cover rounded-md"
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
        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </button>
  )
}