import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { payrollEntries, employees } from '@/lib/schema'
import { desc, inArray } from 'drizzle-orm'
import PayrollEntryTable from '@/features/payroll/_components/PayrollEntryTable'
import PayrollEntryModal from '@/features/payroll/_components/PayrollEntryModal'

interface PayrollPageProps {
  searchParams: Promise<{ modal?: string; editId?: string }>
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const t = await getTranslations('nav')
  const params = await searchParams

  const [allEntries, allEmployees] = await Promise.all([
    db.query.payrollEntries.findMany({
      orderBy: [desc(payrollEntries.periodEnd)],
    }),
    db.select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(inArray(employees.isActive, [true, false])),
  ])

  const employeeNames: Record<string, string> = {}
  allEmployees.forEach(e => { employeeNames[e.id] = e.name })

  const editEntry = params.editId
    ? await db.query.payrollEntries.findFirst({
        where: (table, { eq }) => eq(table.id, params.editId!),
      })
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('payroll')}</h1>
      </div>
      <PayrollEntryTable entries={allEntries} employeeNames={employeeNames} />
      {params.modal === 'add' && (
        <PayrollEntryModal employees={allEmployees} />
      )}
      {params.modal === 'edit' && editEntry && (
        <PayrollEntryModal editId={params.editId} existing={editEntry} employees={allEmployees} />
      )}
    </div>
  )
}
