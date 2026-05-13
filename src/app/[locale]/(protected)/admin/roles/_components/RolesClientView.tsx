"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import {
  createRoleAction,
  deleteRoleAction,
  setRolePermissionsAction,
} from '@/features/admin/_actions/adminActions'
import type { Role, PermissionGroup } from '@/features/admin/_types'

interface RolesClientViewProps {
  roles: Role[]
  groupedPermissions: PermissionGroup[]
}

export default function RolesClientView({ roles: initialRoles, groupedPermissions }: RolesClientViewProps) {
  const _t = useTranslations('admin')
  void _t // used via dynamic t() in JSX
  const [roles, setRoles] = useState(initialRoles)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [selectedPerms, setSelectedPerms] = useState<Record<string, string[]>>({})

  const openPermissionEditor = (roleId: string) => {
    setEditingRoleId(roleId)
    // Get current permissions for this role from groupedPermissions
    const currentPerms: string[] = []
    // We need to track which permissions are assigned - for now we just track by roleId
    setSelectedPerms(prev => ({ ...prev, [roleId]: currentPerms }))
  }

  const togglePerm = (roleId: string, permId: string) => {
    setSelectedPerms(prev => {
      const current = prev[roleId] ?? []
      const updated = current.includes(permId)
        ? current.filter(id => id !== permId)
        : [...current, permId]
      return { ...prev, [roleId]: updated }
    })
  }

  const savePermissions = async (roleId: string) => {
    const permIds = selectedPerms[roleId] ?? []
    await setRolePermissionsAction(roleId, permIds)
    setEditingRoleId(null)
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return
    const result = await createRoleAction(new FormData())
    if ('role' in result && result.role) {
      setRoles(prev => [...prev, result.role])
      setNewRoleName('')
      setNewRoleDesc('')
      setShowCreateModal(false)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Delete this role?')) return
    await deleteRoleAction(roleId)
    setRoles(prev => prev.filter(r => r.id !== roleId))
  }

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'permissions',
      label: 'Permissions',
      render: () => (
        <div className="flex flex-wrap gap-1">
          {groupedPermissions.slice(0, 3).map(gp =>
            gp.permissions.slice(0, 2).map(p => (
              <Badge key={p.id} variant="neutral">{p.key}</Badge>
            ))
          )}
          {groupedPermissions.reduce((sum, gp) => sum + gp.permissions.length, 0) > 6 && (
            <Badge variant="neutral">+more</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Role) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openPermissionEditor(row.id)}>
            Permissions
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDeleteRole(row.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)}>Create Role</Button>
      </div>

      <Table columns={columns} data={roles} />

      {/* Create Role Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Role"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRole}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Role Name"
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            placeholder="e.g. Cashier"
          />
          <Input
            label="Description (optional)"
            value={newRoleDesc}
            onChange={e => setNewRoleDesc(e.target.value)}
            placeholder="Role description"
          />
        </div>
      </Modal>

      {/* Permission Editor Modal */}
      {editingRoleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingRoleId(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl bg-surface-container-lowest p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-on-surface">
                Permissions — {roles.find(r => r.id === editingRoleId)?.name}
              </h2>
              <button onClick={() => setEditingRoleId(null)} className="text-on-surface-variant hover:text-on-surface">
                ✕
              </button>
            </div>
            <div className="space-y-6 mb-6">
              {groupedPermissions.map(gp => (
                <div key={gp.module}>
                  <h3 className="text-sm font-medium text-on-surface mb-2 uppercase">{gp.module}</h3>
                  <div className="flex flex-wrap gap-2">
                    {gp.permissions.map(perm => {
                      const isSelected = selectedPerms[editingRoleId]?.includes(perm.id) ?? false
                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePerm(editingRoleId, perm.id)}
                          className={`px-3 py-1.5 rounded-full text-sm border ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container text-on-surface border-outline'
                          }`}
                        >
                          {perm.key}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingRoleId(null)}>Cancel</Button>
              <Button onClick={() => savePermissions(editingRoleId)}>Save Permissions</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
