import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { employees } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export default async function EmployeesPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const t = await getTranslations('common')

  const allEmployees = await db.query.employees.findMany({
    where: eq(employees.isActive, true),
    orderBy: (employees, { desc }) => [desc(employees.createdAt)],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('employees')}</h1>
        <button className="button button-primary">Add Employee</button>
      </div>

      {allEmployees.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <p>No employees yet</p>
          <p className="text-sm mt-1">Add your first employee to get started</p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Name</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Phone</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Salary</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Hired</th>
              </tr>
            </thead>
            <tbody>
              {allEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-outline-variant last:border-0">
                  <td className="p-4 text-on-surface">{emp.name}</td>
                  <td className="p-4 text-on-surface-variant">{emp.phone ?? '-'}</td>
                  <td className="p-4 text-on-surface">{emp.salaryAmount} ({emp.salaryType})</td>
                  <td className="p-4 text-on-surface-variant">{emp.hiredAt ? new Date(emp.hiredAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}