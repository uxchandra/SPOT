import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/lib/auth'

// Halaman di dalamnya hanya bisa dibuka kalau sudah login
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Memuat...</div>
  }
  if (!user) {
    // Simpan halaman tujuan supaya setelah login langsung kembali ke sana
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

// Halaman hanya bisa dibuka kalau user punya salah satu permission yang disebut.
// allowApprover: izinkan juga user yang ditunjuk sebagai approver di alur approval.
export function RequirePermission({
  permission,
  allowApprover = false,
  children,
}: {
  permission: string | string[]
  allowApprover?: boolean
  children: ReactNode
}) {
  const { user, can } = useAuth()
  const permissions = Array.isArray(permission) ? permission : [permission]

  if (!permissions.some(can) && !(allowApprover && user?.isApprover)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-center">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="text-sm text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      </div>
    )
  }
  return children
}
