import { db } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { employees } from '@/lib/schema'

export interface EmployeeRecord {
  id: string
  userId: string | null
  name: string
  phone: string | null
  salaryType: string
  salaryAmount: string
  hiredAt: Date | null
  isActive: boolean
  createdAt: Date
}

export async function getAllEmployees(includeInactive = false): Promise<EmployeeRecord[]> {
  return db.query.employees.findMany({
    where: includeInactive ? undefined : eq(employees.isActive, true),
    orderBy: [desc(employees.createdAt)],
  })
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord | null> {
  const result = await db.query.employees.findFirst({
    where: eq(employees.id, id),
  })
  return result ?? null
}

export async function createEmployee(data: {
  name: string
  phone?: string
  salaryType: string
  salaryAmount: string
  hiredAt?: Date
  userId?: string
}): Promise<EmployeeRecord> {
  const [employee] = await db.insert(employees).values({
    name: data.name,
    phone: data.phone ?? null,
    salaryType: data.salaryType,
    salaryAmount: data.salaryAmount,
    hiredAt: data.hiredAt ?? null,
    userId: data.userId ?? null,
  }).returning()
  if (!employee) throw new Error('CREATE_FAILED')
  return employee
}

export async function updateEmployee(
  id: string,
  data: {
    name?: string
    phone?: string | null
    salaryType?: string
    salaryAmount?: string
    hiredAt?: Date | null
    userId?: string | null
    isActive?: boolean
  },
): Promise<EmployeeRecord> {
  const [employee] = await db.update(employees).set(data).where(eq(employees.id, id)).returning()
  if (!employee) throw new Error('NOT_FOUND')
  return employee
}

export async function deleteEmployee(id: string): Promise<void> {
  await db.delete(employees).where(eq(employees.id, id))
}
