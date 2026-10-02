import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { DepartmentFormDialog } from '@/components/departments/DepartmentFormDialog'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import type { Department, UserOption } from '@/types'

export default function DepartmentsPage() {
  const { can } = useAuth()
  const canManage = can('department.manage')
  const [departments, setDepartments] = useState<Department[]>([])
  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  // Dialog: undefined = tertutup, null = tambah, Department = edit department tersebut
  const [editing, setEditing] = useState<Department | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Department | null>(null)

  const load = useCallback(async () => {
    try {
      const [departmentList, users] = await Promise.all([
        api.getDepartments(),
        // Pilihan user hanya dibutuhkan untuk form tambah/edit
        canManage ? api.getDepartmentUserOptions() : Promise.resolve([]),
      ])
      setDepartments(departmentList)
      setUserOptions(users)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [canManage])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.deleteDepartment(deleting.id)
      toast.success(`Department ${deleting.name} berhasil dihapus`)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const keyword = search.trim().toLowerCase()
  const filtered = departments.filter((d) =>
    [d.code, d.name, d.position, d.user?.name].some((value) => value?.toLowerCase().includes(keyword)),
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Department</h1>
          <p className="text-sm text-muted-foreground">Data master department perusahaan</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <PlusIcon /> Tambah Department
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Cari kode, nama, jabatan, atau user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>User</TableHead>
                {canManage && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono font-medium">{d.code}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.description ?? '-'}</TableCell>
                  <TableCell>{d.position ?? '-'}</TableCell>
                  <TableCell>
                    {d.user ? (
                      <div className="grid leading-tight">
                        <span>{d.user.name}</span>
                        <span className="text-xs text-muted-foreground">{d.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${d.name}`} onClick={() => setDeleting(d)}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground">
                    {departments.length === 0 ? 'Belum ada department.' : 'Tidak ada department yang cocok.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && (
        <DepartmentFormDialog
          key={editing?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          department={editing}
          userOptions={userOptions}
          onSaved={load}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus department {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Department akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
