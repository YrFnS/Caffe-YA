import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getStockHistory } from '@/features/inventory/_services/stockMovementService'
import StockHistoryTable from '@/features/inventory/_components/StockHistoryTable'

interface StockHistoryPageProps {
  searchParams: Promise<{ ingredientId?: string; productId?: string }>
}

export default async function StockHistoryPage({ searchParams }: StockHistoryPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const params = await searchParams
  const movements = await getStockHistory({
    ingredientId: params.ingredientId,
    productId: params.productId,
    limit: 100,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">Stock History</h1>
      </div>
      <StockHistoryTable movements={movements} />
    </div>
  )
}