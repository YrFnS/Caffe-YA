import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getAllEmployees, getEmployeeById } from '@/features/employees/_services/employeeService'
import { db } from '@/lib/db'
import EmployeeTable from '@/features/employees/_components/EmployeeTable'
import EmployeeModal from '@/features/employees/_components/EmployeeModal'

interface EmployeesPageProps {
  searchParams: Promise<{ modal?: string; editId?: string }>
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')

  const t = await getTranslations('nav')
  const params = await searchParams

  const [allEmployees, allUsers] = await Promise.all([
    getAllEmployees(),
    db.query.users.findMany({
      columns: { id: true, name: true, email: true },
    }),
  ])

  const editEmployee = params.editId
    ? await getEmployeeById(params.editId)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg font-semibold text-on-surface">{t('employees')}</h1>
      </div>
      <EmployeeTable employees={allEmployees} />
      {params.modal === 'add' && (
        <EmployeeModal users={allUsers} />
      )}
      {params.modal === 'edit' && editEmployee && (
        <EmployeeModal editId={params.editId} existing={editEmployee} users={allUsers} />
      )}
    </div>
  )
}
