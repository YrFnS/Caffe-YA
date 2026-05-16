import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { payrollEntries, employees } from '@/lib/schema'
import { desc, eq, inArray } from 'drizzle-orm'

export default async function PayrollPage() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const t = await getTranslations('nav')

  const entries = await db.query.payrollEntries.findMany({
    orderBy: [desc(payrollEntries.periodEnd)],
  })

  // Fetch employee names separately since no relation is defined
  const employeeIds = [...new Set(entries.map(e => e.employeeId))]
  const empMap: Record<string, string> = {}
  if (employeeIds.length > 0) {
    const emps = await db.select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(inArray(employees.id, employeeIds))
    emps.forEach(e => { empMap[e.id] = e.name })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('payroll')}</h1>
        <button className="button button-primary">Add Payroll Entry</button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <p>No payroll entries yet</p>
          <p className="text-sm mt-1">Add your first payroll entry to get started</p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Employee</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Period</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Base Salary</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Bonuses</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Deductions</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Net</th>
                <th className="text-left p-4 text-sm font-medium text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-outline-variant last:border-0">
                  <td className="p-4 text-on-surface">{empMap[entry.employeeId] ?? 'Unknown'}</td>
                  <td className="p-4 text-on-surface-variant">
                    {new Date(entry.periodStart).toLocaleDateString()} - {new Date(entry.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-on-surface">{entry.baseSalary}</td>
                  <td className="p-4 text-on-surface">{entry.bonuses ?? '0'}</td>
                  <td className="p-4 text-on-surface">{entry.deductions ?? '0'}</td>
                  <td className="p-4 text-on-surface font-medium">{entry.netAmount}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${entry.isPaid ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                      {entry.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}