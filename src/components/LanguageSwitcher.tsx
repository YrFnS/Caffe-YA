'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/lib/navigation'
import { Button } from '@/components/ui/button'

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()

  const handleLocaleChange = (newLocale: 'en' | 'ar') => {
    if (newLocale === currentLocale) return
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1" role="group" aria-label="Language">
      <Button
        type="button"
        variant={currentLocale === 'en' ? 'secondary' : 'ghost'}
        size="sm"
        aria-pressed={currentLocale === 'en'}
        onClick={() => handleLocaleChange('en')}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={currentLocale === 'ar' ? 'secondary' : 'ghost'}
        size="sm"
        aria-pressed={currentLocale === 'ar'}
        onClick={() => handleLocaleChange('ar')}
      >
        العربية
      </Button>
    </div>
  )
}
