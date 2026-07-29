import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders } from '@/lib/schema'

export async function getEditableOrder(
  orderId: string,
  userId: string,
  shiftId: string,
) {
  return db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.cashierId, userId),
      eq(orders.shiftId, shiftId),
      inArray(orders.status, ['draft', 'open']),
    ),
  })
}
