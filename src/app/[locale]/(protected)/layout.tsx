"use client"

import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard' },
  { href: '/pos', icon: ShoppingCart, label: 'pos' },
  { href: '/resources', icon: Monitor, label: 'resources' },
  { href: '/shifts', icon: Clock, label: 'shifts' },
  { href: '/inventory', icon: Package, label: 'inventory' },
  { href: '/procurement', icon: Truck, label: 'procurement' },
  { href: '/expenses', icon: Wallet, label: 'expenses' },
  { href: '/employees', icon: Users, label: 'employees' },
  { href: '/payroll', icon: CreditCard, label: 'payroll' },
  { href: '/accounting', icon: PieChart, label: 'accounting' },
  { href: '/partners', icon: Handshake, label: 'partners' },
  { href: '/admin/users', icon: Settings, label: 'admin' },
  { href: '/reports', icon: FileText, label: 'reports' },
]

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  
  const locale = pathname.split('/')[1] || 'en'
  const [currentLocale, setCurrentLocale] = useState(locale)

  const handleLocaleChange = (newLocale: string) => {
    setCurrentLocale(newLocale)
    const pathWithoutLocale = pathname.replace(`/${locale}`, '')
    router.push(`/${newLocale}${pathWithoutLocale || '/dashboard'}`)
  }

  return (
    <div className="flex h-screen bg-surface">
      <aside className="w-60 h-screen bg-surface-container-low flex flex-col">
        <div className="p-4">
          <h1 className="font-display text-xl font-bold text-on-surface mb-0.5">Caffe-YA</h1>
          <p className="text-sm text-on-surface-variant">{tCommon('tagline')}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === `/${locale}${item.href}`
            return (
              <Link
                key={item.href}
                href={`/${locale}${item.href}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface-container-highest text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{t(item.label)}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <User className="w-5 h-5 text-on-surface-variant" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">Admin User</p>
              <p className="text-xs text-on-surface-variant">admin@caffe.ya</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-tertiary hover:text-tertiary hover:bg-tertiary/10"
          >
            <LogOut className="w-4 h-4 me-2" />
            {t('signOut')}
          </Button>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={currentLocale === 'en' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleLocaleChange('en')}
              className="flex-1"
            >
              EN
            </Button>
            <Button
              variant={currentLocale === 'ar' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleLocaleChange('ar')}
              className="flex-1"
            >
              العربية
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}