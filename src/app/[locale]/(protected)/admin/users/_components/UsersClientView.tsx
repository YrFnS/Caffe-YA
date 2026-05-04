"use client"

import { useState } from 'react'
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
  const t = useTranslations('admin')
  const [userList, setUserList] = useState(users)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({})

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
    await setUserRolesAction(userId, roleIds)
    setEditingId(null)
    setUserList(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, roles: roles.filter(r => roleIds.includes(r.id)) }
      }
      return u
    }))
  }

  const toggleDisabled = async (userId: string, isDisabled: boolean) => {
    await updateUserAction(userId, { isDisabled })
    setUserList(prev => prev.map(u => u.id === userId ? { ...u, isDisabled } : u))
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'roles',
      label: 'Roles',
      render: (row: UserWithRoles) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.length === 0 ? (
            <span className="text-on-surface-variant text-sm">No roles</span>
          ) : (
            row.roles.map(r => (
              <Badge key={r.id} variant="neutral">{r.name}</Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: UserWithRoles) => (
        row.isDisabled
          ? <Badge variant="error">Disabled</Badge>
          : row.isActive
            ? <Badge variant="success">Active</Badge>
            : <Badge variant="warning">Inactive</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: UserWithRoles) => (
        <div className="flex gap-2">
          {editingId === row.id ? (
            <>
              <Button size="sm" onClick={() => saveRoles(row.id)}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingId(row.id)
                  setSelectedRoles(prev => ({ ...prev, [row.id]: row.roles.map(r => r.id) }))
                }}
              >
                Edit Roles
              </Button>
              {row.id !== currentUserId && (
                <Button
                  size="sm"
                  variant={row.isDisabled ? 'success' : 'destructive'}
                  onClick={() => toggleDisabled(row.id, !row.isDisabled)}
                >
                  {row.isDisabled ? 'Enable' : 'Disable'}
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {editingId && (
        <div className="bg-surface-container-lowest border border-outline rounded-lg p-4">
          <h3 className="text-sm font-medium text-on-surface mb-3">
            Assign Roles — {userList.find(u => u.id === editingId)?.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => {
              const isSelected = selectedRoles[editingId]?.includes(role.id) ?? false
              return (
                <button
                  key={role.id}
                  onClick={() => toggleRole(editingId, role.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    isSelected
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container text-on-surface border-outline'
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
