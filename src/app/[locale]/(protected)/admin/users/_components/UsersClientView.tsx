"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateUserAction, setUserRolesAction } from '@/features/admin/_actions/adminActions'
import type { UserWithRoles, Role } from '@/features/admin/_types'

interface UsersClientViewProps {
  users: UserWithRoles[]
  roles: Role[]
  currentUserId: string
}

export default function UsersClientView({ users, roles, currentUserId }: UsersClientViewProps) {
  const router = useRouter()
  const t = useTranslations('admin')
  const [userList, setUserList] = useState(users)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({})
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const toggleRole = (userId: string, roleId: string) => {
    setSelectedRoles(prev => {
      const current = prev[userId] ?? userList.find(u => u.id === userId)?.roles.map(r => r.id) ?? []
      const updated = current.includes(roleId)
        ? current.filter(id => id !== roleId)
        : [...current, roleId]
      return { ...prev, [userId]: updated }
    })
  }

  const saveRoles = async (userId: string) => {
    const roleIds = selectedRoles[userId] ?? []
    setPendingUserId(userId)
    setError('')
    try {
      const result = await setUserRolesAction(userId, roleIds)
      if (result.error) {
        setError(result.error)
        return
      }
      setEditingId(null)
      setUserList(prev => prev.map(user => (
        user.id === userId
          ? { ...user, roles: roles.filter(role => roleIds.includes(role.id)) }
          : user
      )))
    } finally {
      setPendingUserId(null)
    }
  }

  const toggleDisabled = async (userId: string, isDisabled: boolean) => {
    setPendingUserId(userId)
    setError('')
    try {
      const result = await updateUserAction(userId, { isDisabled })
      if (result.error) {
        setError(result.error)
        return
      }
      setUserList(prev => prev.map(user => user.id === userId ? { ...user, isDisabled } : user))
    } finally {
      setPendingUserId(null)
    }
  }

  const columns = [
    { key: 'name', label: t('name'), sortable: true },
    { key: 'email', label: t('email'), sortable: true },
    {
      key: 'roles',
      label: t('roles'),
      render: (row: UserWithRoles) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.length === 0 ? (
            <span className="text-sm text-on-surface-variant">{t('noRoles')}</span>
          ) : (
            row.roles.map(role => (
              <Badge key={role.id} variant="neutral">{role.name}</Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      render: (row: UserWithRoles) => (
        row.isDisabled
          ? <Badge variant="error">{t('disabled')}</Badge>
          : row.isActive
            ? <Badge variant="success">{t('active')}</Badge>
            : <Badge variant="warning">{t('inactive')}</Badge>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (row: UserWithRoles) => (
        <div className="flex flex-wrap gap-2">
          {editingId === row.id ? (
            <>
              <Button size="sm" disabled={pendingUserId === row.id} onClick={() => saveRoles(row.id)}>{t('save')}</Button>
              <Button size="sm" variant="ghost" disabled={pendingUserId === row.id} onClick={() => setEditingId(null)}>{t('cancel')}</Button>
            </>
          ) : row.id !== currentUserId ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pendingUserId === row.id}
                onClick={() => {
                  setError('')
                  setEditingId(row.id)
                  setSelectedRoles(prev => ({ ...prev, [row.id]: row.roles.map(role => role.id) }))
                }}
              >
                {t('editRoles')}
              </Button>
              <Button
                size="sm"
                variant={row.isDisabled ? 'success' : 'destructive'}
                disabled={pendingUserId === row.id}
                onClick={() => toggleDisabled(row.id, !row.isDisabled)}
              >
                {row.isDisabled ? t('enable') : t('disable')}
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => router.push('?modal=add')}>
          {t('addUser')}
        </Button>
      </div>
      {editingId && (
        <div className="rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-4">
          <h3 className="mb-3 text-sm font-medium text-on-surface">
            {t('assignRoles')} - {userList.find(user => user.id === editingId)?.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => {
              const isSelected = selectedRoles[editingId]?.includes(role.id) ?? false
              return (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => toggleRole(editingId, role.id)}
                  className={`min-h-10 rounded-full border px-3 py-1.5 text-sm ${
                    isSelected
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface'
                  }`}
                >
                  {role.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <Table columns={columns} data={userList} />
    </div>
  )
}
