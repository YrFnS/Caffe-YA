"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createUserAction } from '@/features/admin/_actions/adminActions'

export default function UserModal() {
  const router = useRouter()
  const t = useTranslations('admin')
  const common = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleClose = () => {
    router.push('/admin/users')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.set('name', form.name)
      formData.set('email', form.email)
      formData.set('password', form.password)

      const result = await createUserAction(formData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push('/admin/users')
      router.refresh()
    } catch {
      setError(t('createUserFailed'))
      setLoading(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title={t('addUser')}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            {common('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t('creatingUser') : t('createUser')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-error">{error}</div>
        )}
        <Input
          label={t('name')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder={t('namePlaceholder')}
        />
        <Input
          label={t('email')}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          placeholder={t('emailPlaceholder')}
        />
        <Input
          label={t('password')}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          placeholder={t('passwordPlaceholder')}
          minLength={8}
        />
      </form>
    </Modal>
  )
}
