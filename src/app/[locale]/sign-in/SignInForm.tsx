'use client'

import { useState } from 'react'
import { createAuthClient } from 'better-auth/client'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
        <label className="block text-label-md text-on-surface-variant mb-1.5">
          {t('email')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@caffe.ya"
          className="w-full h-12 px-4 bg-surface-container-highest rounded-lg text-body-lg text-on-surface
            outline-none focus:ring-2 focus:ring-outline placeholder:text-on-surface-disabled"
          required
        />
      </div>

      <div>
        <label className="block text-label-md text-on-surface-variant mb-1.5">
          {t('password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full h-12 px-4 bg-surface-container-highest rounded-lg text-body-lg text-on-surface
            outline-none focus:ring-2 focus:ring-outline placeholder:text-on-surface-disabled"
          required
        />
      </div>

      {error && (
        <p className="text-body-sm text-tertiary">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading || !email || !password ? true : false}
        className="w-full h-12"
      >
        {loading ? tCommon('loading') : t('signIn')}
      </Button>
    </form>
  )
}
