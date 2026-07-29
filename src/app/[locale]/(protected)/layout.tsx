"use client"

import { useEffect, useState } from 'react'
import { createAuthClient } from 'better-auth/client'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import {
  Clock,
  Coffee,
  CreditCard,
  FileText,
  Gamepad2,
  Handshake,
  LayoutDashboard,
  LogOut,
  Monitor,
  Package,
  PieChart,
  Settings,
  ShoppingCart,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNavigationAccessAction } from '@/features/admin/_actions/adminActions'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard', moduleName: null },
  { href: '/pos', icon: ShoppingCart, label: 'pos', moduleName: 'pos' },
  { href: '/resources', icon: Monitor, label: 'resources', moduleName: 'resources' },
  { href: '/shifts', icon: Clock, label: 'shifts', moduleName: 'shifts' },
  { href: '/inventory', icon: Package, label: 'inventory', moduleName: 'inventory' },
  { href: '/procurement', icon: Truck, label: 'procurement', moduleName: 'procurement' },
  { href: '/expenses', icon: Wallet, label: 'expenses', moduleName: 'expenses' },
  { href: '/employees', icon: Users, label: 'employees', moduleName: 'employees' },
  { href: '/payroll', icon: CreditCard, label: 'payroll', moduleName: 'payroll' },
  { href: '/accounting', icon: PieChart, label: 'accounting', moduleName: 'accounting' },
  { href: '/partners', icon: Handshake, label: 'partners', moduleName: 'partners' },
  { href: '/admin/users', icon: Settings, label: 'admin', moduleName: 'admin' },
  { href: '/reports', icon: FileText, label: 'reports', moduleName: 'reports' },
] as const

const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
})

type NavigationAccess = {
  userName: string
  modules: string[]
  disabledModules: string[]
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('nav')
  const common = useTranslations('common')
  const [access, setAccess] = useState<NavigationAccess | null>(null)

  useEffect(() => {
    let active = true
    getNavigationAccessAction().then(result => {
      if (active) setAccess(result)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!/^\/(?:dashboard|resources|pos|shifts)(?:\/|$)/.test(pathname)) return

    const refresh = () => {
      if (!document.hidden) router.refresh()
    }
    const interval = window.setInterval(refresh, 15_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [pathname, router])

  const visibleNavItems = navItems.filter(item => item.moduleName === null || (
    access?.modules.includes(item.moduleName) && !access.disabledModules.includes(item.moduleName)
  ))

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const handleLocaleChange = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en'
    router.replace(pathname, { locale: nextLocale })
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col border-e border-white/10 bg-[#111923] text-white md:flex lg:w-72">
        <div className="flex items-center gap-3 border-b border-white/10 p-4 lg:p-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/20">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="font-display text-xl font-bold tracking-tight">{common('appName')}</h1>
            <p className="truncate text-xs text-slate-400">{common('tagline')}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2 lg:p-3" aria-label={t('liveOperations')}>
          {visibleNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-12 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-all lg:justify-start',
                isActive(item.href)
                  ? 'bg-white/12 text-white shadow-sm ring-1 ring-white/10'
                  : 'text-slate-400 hover:bg-white/7 hover:text-white'
              )}
              title={t(item.label)}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{t(item.label)}</span>
            </Link>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-2 lg:p-3">
          <div className="flex items-center justify-center gap-3 rounded-xl bg-white/5 px-2 py-2.5 lg:justify-start">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
              <User className="h-4 w-4 text-slate-300" />
            </div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <p className="truncate text-sm font-medium text-white">{access?.userName ?? common('appName')}</p>
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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLocaleChange}
            className="w-full text-slate-300 hover:bg-white/7 hover:text-white"
            aria-label={locale === 'en' ? 'العربية' : 'English'}
          >
            {locale === 'en' ? 'العربية' : 'EN'}
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/50 bg-surface/95 px-4 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-white">
              <Coffee className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-on-surface">{common('appName')}</p>
              <p className="truncate text-xs text-on-surface-variant">{access?.userName ?? common('tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleLocaleChange} aria-label={locale === 'en' ? 'العربية' : 'English'}>
              <span className="text-xs font-bold">{locale === 'en' ? 'ع' : 'EN'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label={t('signOut')}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden">
          <div className="mx-auto max-w-[1600px] p-4 pb-28 sm:p-6 sm:pb-28 md:p-6 md:pb-6 lg:p-10">
            <div className="mb-5 hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant sm:flex">
              <Gamepad2 className="h-4 w-4 text-secondary" /> {t('liveOperations')}
            </div>
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-20 items-stretch gap-1 overflow-x-auto border-t border-outline-variant/60 bg-surface-container-lowest/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(24,34,48,.08)] backdrop-blur md:hidden" aria-label={t('liveOperations')}>
        {visibleNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[0.65rem] font-medium transition-colors',
              isActive(item.href)
                ? 'bg-secondary/10 text-secondary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            )}
            aria-current={isActive(item.href) ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-[4.5rem] truncate">{t(item.label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
