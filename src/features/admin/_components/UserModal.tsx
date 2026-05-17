"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createUserAction } from '@/features/admin/_actions/adminActions'

export default function UserModal() {
  const router = useRouter()
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
      setError('Failed to create user')
      setLoading(false)
    }
  }

  return (
    <Modal
      open={true}
      onClose={handleClose}
      title="Add User"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-error">{error}</div>
        )}
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="John Doe"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          placeholder="john@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          placeholder="Minimum 8 characters"
          minLength={8}
        />
      </form>
    </Modal>
  )
}
