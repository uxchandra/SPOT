import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import type { DepartmentRef, ManagedUser, Role } from '@/types'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<DepartmentRef[]>([])
  const [search, setSearch] = useState('')
  // Dialog: undefined = tertutup, null = tambah user, ManagedUser = edit user tersebut
  const [editing, setEditing] = useState<ManagedUser | null | undefined>(undefined)

  const load = useCallback(async () => {
    try {
      const [userList, roleList, departmentList] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getUserDepartmentOptions(),
      ])
      setUsers(userList)
      setRoles(roleList)
      setDepartments(departmentList)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const keyword = search.trim().toLowerCase()
  const filtered = users.filter(
    (u) => [u.name, u.email, u.department?.name].some((value) => value?.toLowerCase().includes(keyword)),
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">User</h1>
          <p className="text-sm text-muted-foreground">Kelola akun yang bisa login ke aplikasi</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon /> Tambah User
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Cari nama, email, atau department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === currentUser?.id && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.department?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role.name}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Tidak ada user.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && (
        <UserFormDialog
          // key: form diisi ulang setiap dialog dibuka untuk user yang berbeda
          key={editing?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          user={editing}
          roles={roles}
          departments={departments}
          isSelf={editing?.id === currentUser?.id}
          onSaved={load}
        />
      )}
    </>
  )
}
