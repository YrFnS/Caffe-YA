"use client"

import { useEffect, useState } from 'react'
import { createAuthClient } from 'better-auth/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Monitor,
  Clock,
  Package,
  Truck,
  Wallet,
  Users,
  CreditCard,
  PieChart,
  Handshake,
  Settings,
  FileText,
  LogOut,
  User,
  Coffee,
  Gamepad2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNavigationAccessAction } from '@/features/admin/_actions/adminActions'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard', module: null },
  { href: '/pos', icon: ShoppingCart, label: 'pos', module: 'pos' },
  { href: '/resources', icon: Monitor, label: 'resources', module: 'resources' },
  { href: '/shifts', icon: Clock, label: 'shifts', module: 'shifts' },
  { href: '/inventory', icon: Package, label: 'inventory', module: 'inventory' },
  { href: '/procurement', icon: Truck, label: 'procurement', module: 'procurement' },
  { href: '/expenses', icon: Wallet, label: 'expenses', module: 'expenses' },
  { href: '/employees', icon: Users, label: 'employees', module: 'employees' },
  { href: '/payroll', icon: CreditCard, label: 'payroll', module: 'payroll' },
  { href: '/accounting', icon: PieChart, label: 'accounting', module: 'accounting' },
  { href: '/partners', icon: Handshake, label: 'partners', module: 'partners' },
  { href: '/admin/users', icon: Settings, label: 'admin', module: 'admin' },
  { href: '/reports', icon: FileText, label: 'reports', module: 'reports' },
]

const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
})

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('nav')
  
  const locale = pathname.split('/')[1] || 'en'
  const [currentLocale, setCurrentLocale] = useState(locale)
  const [access, setAccess] = useState<{ userName: string; modules: string[]; disabledModules: string[] } | null>(null)

  useEffect(() => {
    getNavigationAccessAction().then(setAccess)
  }, [])

  const visibleNavItems = navItems.filter(item => item.module === null || (
    access?.modules.includes(item.module) && !access.disabledModules.includes(item.module)
  ))

  const handleLocaleChange = (newLocale: string) => {
    setCurrentLocale(newLocale)
    const pathWithoutLocale = pathname.replace(`/${locale}`, '')
    router.push(`/${newLocale}${pathWithoutLocale || '/dashboard'}`)
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push(`/${locale}/sign-in`)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col border-e border-white/10 bg-[#111923] text-white lg:w-72">
        <div className="flex items-center gap-3 border-b border-white/10 p-4 lg:p-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="font-display text-xl font-bold tracking-tight">Caffe YA</h1>
            <p className="truncate text-xs text-slate-400">Cafe × Gaming</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2 lg:p-3">
          {visibleNavItems.map((item) => {
            const isActive = pathname === `/${locale}${item.href}`
            return (
              <Link
                key={item.href}
                href={`/${locale}${item.href}`}
                className={cn(
                  'flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all lg:justify-start',
                  isActive
                    ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-400 hover:bg-white/7 hover:text-white'
                )}
                title={t(item.label)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:inline">{t(item.label)}</span>
              </Link>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-2 lg:p-3">
          <div className="flex items-center justify-center gap-3 rounded-xl bg-white/5 px-2 py-2.5 lg:justify-start">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
              <User className="h-4 w-4 text-slate-300" />
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-sm font-medium text-white">{access?.userName ?? 'Caffe YA'}</p>
              <p className="truncate text-xs text-slate-400">{t('signedIn')}</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-center text-slate-400 hover:bg-white/7 hover:text-white lg:justify-start"
            title={t('signOut')}
          >
            <LogOut className="h-4 w-4 lg:me-2" />
            <span className="hidden lg:inline">{t('signOut')}</span>
          </Button>

          <div className="grid grid-cols-1 gap-1 pt-1 lg:grid-cols-2">
            <Button
              variant={currentLocale === 'en' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleLocaleChange('en')}
              className="h-9 px-1 text-xs"
            >
              EN
            </Button>
            <Button
              variant={currentLocale === 'ar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleLocaleChange('ar')}
              className="h-9 px-1 text-xs"
            >
              العربية
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-10">
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            <Gamepad2 className="h-4 w-4 text-secondary" /> {t('liveOperations')}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
