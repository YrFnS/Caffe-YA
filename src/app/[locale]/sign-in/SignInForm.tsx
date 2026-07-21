'use client'

import { useState } from 'react'
import { createAuthClient } from 'better-auth/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LockKeyhole, Mail } from 'lucide-react'

const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
})

interface SignInFormProps {
  locale: string
}

export default function SignInForm({ locale }: SignInFormProps) {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
      })
      if (authError) {
        setError(authError.message || 'Invalid credentials')
        setLoading(false)
        return
      }
      router.push(`/${locale}/dashboard`)
      router.refresh()
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-on-surface">
          {t('email')}
        </label>
        <div className="relative"><Mail className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-disabled" /><input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@caffe.ya"
          className="h-12 w-full rounded-xl border border-outline-variant bg-white px-4 ps-11 text-on-surface outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10 placeholder:text-on-surface-disabled"
          required
        /></div>
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-on-surface">
          {t('password')}
        </label>
        <div className="relative"><LockKeyhole className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-disabled" /><input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="h-12 w-full rounded-xl border border-outline-variant bg-white px-4 ps-11 text-on-surface outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10 placeholder:text-on-surface-disabled"
          required
        /></div>
      </div>

      {error && (
        <p className="text-body-sm text-tertiary">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading || !email || !password ? true : false}
        className="h-12 w-full rounded-xl bg-secondary text-white shadow-lg shadow-secondary/20 hover:bg-secondary/90"
      >
        {loading ? tCommon('loading') : t('signIn')}
      </Button>
    </form>
  )
}
