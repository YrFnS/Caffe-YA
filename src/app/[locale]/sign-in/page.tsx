import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import SignInForm from './SignInForm'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  const t = await getTranslations('common')
  if (session?.user) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-on-surface">Caffe-YA</h1>
          <p className="text-on-surface-variant mt-1">{t('tagline')}</p>
          <div className="mt-2 flex justify-center gap-2">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6">
          <SignInForm locale={locale} />
        </div>
      </div>
    </div>
  )
}
