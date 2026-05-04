'use client'

import { useEffect, useState } from 'react'
import { hasPermission } from '../_actions/adminActions'

interface PermissionGateProps {
  permissionKey: string
  userId: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function PermissionGate({
  permissionKey,
  userId,
  children,
  fallback = null,
}: PermissionGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    hasPermission(userId, permissionKey).then(result => {
      if (mounted) setHasAccess(result)
    })
    return () => { mounted = false }
  }, [userId, permissionKey])

  if (hasAccess === null) return null
  if (hasAccess === false) return <>{fallback}</>
  return <>{children}</>
}
