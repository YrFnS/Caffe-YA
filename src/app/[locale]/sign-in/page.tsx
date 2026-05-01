import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import SignInForm from './SignInForm'

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (session?.user) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-on-surface">Caffe-YA</h1>
          <p className="text-on-surface-variant mt-1">Coffee & Gaming</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-lg">
          <SignInForm locale={locale} />
        </div>
      </div>
    </div>
  )
}
