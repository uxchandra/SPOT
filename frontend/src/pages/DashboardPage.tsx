import { useEffect, useState } from 'react'
import { BuildingIcon, ClipboardCheckIcon, PackageIcon, ShieldCheckIcon, TruckIcon, UsersIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { api } from '@/api'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { usePendingApprovals } from '@/lib/pending-approvals'

interface Summary {
  label: string
  url: string
  icon: ReactNode
  permission: string
  load: () => Promise<unknown[]>
}

// Ringkasan jumlah data. Kartu hanya tampil kalau user punya akses ke menunya.
const SUMMARIES: Summary[] = [
  { label: 'Item', url: '/items', icon: <PackageIcon />, permission: 'item.view', load: api.getItems },
  { label: 'Supplier', url: '/suppliers', icon: <TruckIcon />, permission: 'supplier.view', load: api.getSuppliers },
  { label: 'Department', url: '/departments', icon: <BuildingIcon />, permission: 'department.view', load: api.getDepartments },
  { label: 'User', url: '/users', icon: <UsersIcon />, permission: 'user.manage', load: api.getUsers },
  { label: 'Role', url: '/roles', icon: <ShieldCheckIcon />, permission: 'role.manage', load: api.getRoles },
]

export default function DashboardPage() {
  const { user, can } = useAuth()
  const { count: pendingCount } = usePendingApprovals()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const visible = SUMMARIES.filter((s) => can(s.permission))

  useEffect(() => {
    for (const s of SUMMARIES.filter((s) => can(s.permission))) {
      s.load()
        .then((rows) => setCounts((prev) => ({ ...prev, [s.label]: rows.length })))
        .catch(() => {})
    }
  }, [can])

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Selamat datang, {user?.name}.</p>
      </div>

      {pendingCount > 0 && (
        <Link
          to="/purchase-requests?tab=pending"
          className="flex items-center gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 transition-shadow hover:shadow-md dark:border-amber-800 dark:bg-amber-950"
        >
          <ClipboardCheckIcon className="size-8 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">
              {pendingCount} Permintaan Barang menunggu approval Anda
            </p>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80">Klik untuk memeriksa dan menyetujui.</p>
          </div>
        </Link>
      )}

      {visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <Link key={s.label} to={s.url} className="rounded-xl transition-shadow hover:shadow-md">
              <Card>
                <CardHeader>
                  <CardDescription className="flex items-center gap-2 [&_svg]:size-4">
                    {s.icon} {s.label}
                  </CardDescription>
                  <CardTitle className="text-3xl tabular-nums">{counts[s.label] ?? '-'}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
