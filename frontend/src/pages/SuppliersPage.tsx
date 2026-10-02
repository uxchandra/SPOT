import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { StatusBadge } from '@/components/status-badge'
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import type { Supplier } from '@/types'

export default function SuppliersPage() {
  const { can } = useAuth()
  const canManage = can('supplier.manage')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  // Dialog: undefined = tertutup, null = tambah, Supplier = edit supplier tersebut
  const [editing, setEditing] = useState<Supplier | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Supplier | null>(null)

  const load = useCallback(async () => {
    try {
      setSuppliers(await api.getSuppliers())
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.deleteSupplier(deleting.id)
      toast.success(`Supplier ${deleting.name} berhasil dihapus`)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const keyword = search.trim().toLowerCase()
  const filtered = suppliers.filter((s) =>
    [s.code, s.name, s.contactPerson, s.phone, s.email].some((value) => value?.toLowerCase().includes(keyword)),
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Supplier</h1>
          <p className="text-sm text-muted-foreground">Data pemasok barang</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <PlusIcon /> Tambah Supplier
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Cari kode, nama, kontak, telepon, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Item</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-medium">{s.code}</TableCell>
                  <TableCell>
                    <div className="grid leading-tight">
                      <span>{s.name}</span>
                      {s.npwp && <span className="text-xs text-muted-foreground">NPWP {s.npwp}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.contactPerson || s.phone ? (
                      <div className="grid leading-tight">
                        <span>{s.contactPerson ?? '-'}</span>
                        <span className="text-xs text-muted-foreground">{s.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{s.email ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.itemCount}</TableCell>
                  <TableCell>
                    <StatusBadge active={s.isActive} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${s.name}`} onClick={() => setDeleting(s)}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center text-muted-foreground">
                    {suppliers.length === 0 ? 'Belum ada supplier.' : 'Tidak ada supplier yang cocok.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && (
        <SupplierFormDialog
          key={editing?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          supplier={editing}
          onSaved={load}
        />
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus supplier ${deleting?.name}?`}
        description="Supplier akan dihapus permanen. Kalau supplier hanya sudah tidak dipakai, sebaiknya nonaktifkan saja supaya riwayatnya tetap ada."
        onConfirm={handleDelete}
      />
    </>
  )
}
