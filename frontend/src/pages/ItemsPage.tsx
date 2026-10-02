import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { ItemFormDialog } from '@/components/items/ItemFormDialog'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'
import type { Item, ItemFormOptions } from '@/types'

const ALL_CATEGORIES = 'all'

export default function ItemsPage() {
  const { can } = useAuth()
  const canManage = can('item.manage')
  const [items, setItems] = useState<Item[]>([])
  const [options, setOptions] = useState<ItemFormOptions>({ units: [], categories: [], suppliers: [] })
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES)
  // Dialog: undefined = tertutup, null = tambah, Item = edit item tersebut
  const [editing, setEditing] = useState<Item | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<Item | null>(null)

  const load = useCallback(async () => {
    try {
      const [itemList, formOptions] = await Promise.all([api.getItems(), api.getItemFormOptions()])
      setItems(itemList)
      setOptions(formOptions)
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
      await api.deleteItem(deleting.id)
      toast.success(`Item ${deleting.name} berhasil dihapus`)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const keyword = search.trim().toLowerCase()
  const filtered = items.filter(
    (i) =>
      (categoryFilter === ALL_CATEGORIES || String(i.category.id) === categoryFilter) &&
      [i.code, i.name, i.brand, i.supplier?.name].some((value) => value?.toLowerCase().includes(keyword)),
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Item List</h1>
          <p className="text-sm text-muted-foreground">Daftar barang beserta harga acuan</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <PlusIcon /> Tambah Item
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Cari kode, nama, merk, atau supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48" aria-label="Filter kategori">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>Semua kategori</SelectItem>
                {options.categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono font-medium">{i.code}</TableCell>
                  <TableCell>
                    <div className="grid max-w-72 leading-tight">
                      <span className="truncate">{i.name}</span>
                      {(i.brand || i.specification) && (
                        <span className="truncate text-xs text-muted-foreground">
                          {[i.brand, i.specification].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{i.category.name}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(i.price)}</TableCell>
                  <TableCell>{i.supplier?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>
                    <StatusBadge active={i.isActive} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${i.name}`} onClick={() => setDeleting(i)}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} className="text-center text-muted-foreground">
                    {items.length === 0 ? 'Belum ada item.' : 'Tidak ada item yang cocok.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && (
        <ItemFormDialog
          key={editing?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          item={editing}
          options={options}
          onSaved={load}
        />
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus item ${deleting?.name}?`}
        description="Item akan dihapus permanen. Kalau item hanya sudah tidak dipakai, sebaiknya nonaktifkan saja."
        onConfirm={handleDelete}
      />
    </>
  )
}
