'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LanguageSwitcher({ locale }: { locale: string }) {
  const router = useRouter()
  const currentLocale = useLocale()
  const params = useParams()

  const handleLocaleChange = (newLocale: string) => {
    const pathWithoutLocale = params.locale 
      ? window.location.pathname.replace(`/${params.locale}`, '')
      : window.location.pathname
    router.push(`/${newLocale}${pathWithoutLocale || '/sign-in'}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={currentLocale === 'en' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleLocaleChange('en')}
      >
        EN
      </Button>
      <Button
        variant={currentLocale === 'ar' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleLocaleChange('ar')}
      >
        العربية
      </Button>
    </div>
  )
}
