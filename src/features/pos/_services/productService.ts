import { db } from '@/lib/db'
import { productCategories, products } from '@/lib/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function getCategories() {
  return db.query.productCategories.findMany({
    where: isNull(productCategories.parentId),
  })
}

export async function getAllActiveProducts() {
  return db.query.products.findMany({
    where: eq(products.isActive, true),
    with: {
      category: true
    }
  })
}

export async function getProductsByCategory(categoryId: string) {
  return db.query.products.findMany({
    where: and(
      eq(products.categoryId, categoryId),
      eq(products.isActive, true)
    )
  })
}