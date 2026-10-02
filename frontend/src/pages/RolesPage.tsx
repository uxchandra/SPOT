import { useCallback, useEffect, useState } from 'react'
import { EyeIcon, LockIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { RoleFormDialog } from '@/components/roles/RoleFormDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import type { PermissionOption, Role } from '@/types'

export default function RolesPage() {
  const { user, refresh } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<PermissionOption[]>([])
  // Dialog: undefined = tertutup, null = tambah role, Role = edit role tersebut
  const [editing, setEditing] = useState<Role | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Role | null>(null)

  const load = useCallback(async () => {
    try {
      const [roleList, permissionList] = await Promise.all([api.getRoles(), api.getPermissions()])
      setRoles(roleList)
      setPermissions(permissionList)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSaved() {
    await load()
    // Kalau role milik user sendiri yang diubah, perbarui permission-nya (menu & tombol)
    await refresh()
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.deleteRole(deleting.id)
      toast.success(`Role ${deleting.name} berhasil dihapus`)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Role</h1>
          <p className="text-sm text-muted-foreground">Atur role dan permission yang dimiliki setiap role</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon /> Tambah Role
        </Button>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Permission</TableHead>
                <TableHead className="text-right">User</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {role.name}
                      {role.isSystem && (
                        <Badge variant="secondary">
                          <LockIcon /> Sistem
                        </Badge>
                      )}
                      {role.name === user?.role && <span className="text-xs text-muted-foreground">(role Anda)</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {role.permissions.length}/{permissions.length}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{role.userCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${role.isSystem ? 'Lihat' : 'Edit'} role ${role.name}`}
                      onClick={() => setEditing(role)}
                    >
                      {role.isSystem ? <EyeIcon /> : <PencilIcon />}
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus role ${role.name}`}
                        onClick={() => setDeleting(role)}
                      >
                        <Trash2Icon />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && (
        <RoleFormDialog
          key={editing?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          role={editing}
          permissions={permissions}
          onSaved={handleSaved}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus role {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && deleting.userCount > 0
                ? `Role ini masih dipakai ${deleting.userCount} user, jadi belum bisa dihapus. Pindahkan user tersebut ke role lain terlebih dahulu.`
                : 'Role akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            {deleting && deleting.userCount === 0 && (
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                Hapus
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
