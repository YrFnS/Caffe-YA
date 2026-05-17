'use server'

import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../_services/employeeService'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getEmployeesAction() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getAllEmployees()
}

export async function getEmployeeAction(id: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return getEmployeeById(id)
}

export async function createEmployeeAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string | null
  const salaryType = formData.get('salaryType') as string
  const salaryAmount = formData.get('salaryAmount') as string
  const hiredAt = formData.get('hiredAt') as string | null
  const userId = formData.get('userId') as string | null

  if (!name || !salaryType || !salaryAmount) return { error: 'INVALID_INPUT' }

  try {
    await createEmployee({
      name,
      phone: phone || undefined,
      salaryType,
      salaryAmount,
      hiredAt: hiredAt ? new Date(hiredAt) : undefined,
      userId: userId || undefined,
    })
    revalidatePath('/employees')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'CREATE_EMPLOYEE_FAILED' }
  }
}

export async function updateEmployeeAction(formData: FormData) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const employeeId = formData.get('id') as string
  if (!employeeId) return { error: 'INVALID_INPUT' }

  const name = formData.get('name') as string | null
  const phone = formData.get('phone') as string | null
  const salaryType = formData.get('salaryType') as string | null
  const salaryAmount = formData.get('salaryAmount') as string | null
  const hiredAt = formData.get('hiredAt') as string | null
  const userId = formData.get('userId') as string | null

  const data: Parameters<typeof updateEmployee>[1] = {}
  if (name) data.name = name
  if (phone !== null) data.phone = phone || null
  if (salaryType) data.salaryType = salaryType
  if (salaryAmount) data.salaryAmount = salaryAmount
  if (hiredAt !== null) data.hiredAt = hiredAt ? new Date(hiredAt) : null
  if (userId !== null) data.userId = userId || null

  try {
    await updateEmployee(employeeId, data)
    revalidatePath('/employees')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'UPDATE_EMPLOYEE_FAILED' }
  }
}

export async function deleteEmployeeAction(employeeId: string) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  if (!employeeId) return { error: 'INVALID_INPUT' }

  try {
    await deleteEmployee(employeeId)
    revalidatePath('/employees')
    return { success: true }
  } catch (e) {
    if (e instanceof Error) return { error: e.message }
    return { error: 'DELETE_EMPLOYEE_FAILED' }
  }
}
