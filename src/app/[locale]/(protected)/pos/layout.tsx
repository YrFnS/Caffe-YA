import PermissionGate from '@/components/PermissionGate'

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  return <PermissionGate locale={(await params).locale} permission="pos.view">{children}</PermissionGate>
}
