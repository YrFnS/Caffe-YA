'use server'

import { createUnit, updateUnit, deleteUnit, getAllUnits } from '../_services/unitService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/features/admin/_actions/adminActions'

export async function getUnitsAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.view')
  return getAllUnits()
}

export async function createUnitAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_ingredients')

  const name = formData.get('name') as string
  const abbreviation = formData.get('abbreviation') as string
  if (!name || !abbreviation) return { error: 'INVALID_INPUT' }

  try {
    await createUnit(name, abbreviation)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'CREATE_UNIT_FAILED' }
  }
}

export async function updateUnitAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_ingredients')

  const unitId = formData.get('unitId') as string
  const name = formData.get('name') as string | null
  const abbreviation = formData.get('abbreviation') as string | null
  if (!unitId) return { error: 'INVALID_INPUT' }

  try {
    await updateUnit(unitId, { name: name ?? undefined, abbreviation: abbreviation ?? undefined })
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'UPDATE_UNIT_FAILED' }
  }
}

export async function deleteUnitAction(unitId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  await requirePermission(session.user.id, 'inventory.manage_ingredients')

  if (!unitId) return { error: 'INVALID_INPUT' }

  try {
    await deleteUnit(unitId)
    revalidatePath('/inventory')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'DELETE_UNIT_FAILED' }
  }
}
