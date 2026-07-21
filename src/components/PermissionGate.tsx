import { redirect } from 'next/navigation'
import { hasPermission } from '@/features/admin/_actions/adminActions'
import { getSession } from '@/lib/auth'

export default async function PermissionGate({
  children,
  locale,
  permission,
}: {
  children: React.ReactNode
  locale: string
  permission: string
}) {
  const session = await getSession()
  if (!session?.user) redirect(`/${locale}/sign-in`)
  if (!await hasPermission(session.user.id, permission)) redirect(`/${locale}/dashboard`)
  return children
}
