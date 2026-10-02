import { useCallback, useEffect, useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { ItemCategoryFormDialog } from '@/components/item-categories/ItemCategoryFormDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/lib/auth'
import type { ItemCategory } from '@/types'

export default function ItemCategoriesPage() {
  const { can } = useAuth()
  const canManage = can('item_category.manage')
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [search, setSearch] = useState('')
  // Dialog: undefined = tertutup, null = tambah, ItemCategory = edit kategori tersebut
  const [editing, setEditing] = useState<ItemCategory | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<ItemCategory | null>(null)

  const load = useCallback(async () => {
    try {
      setCategories(await api.getItemCategories())
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
      await api.deleteItemCategory(deleting.id)
      toast.success(`Kategori ${deleting.name} berhasil dihapus`)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const keyword = search.trim().toLowerCase()
  const filtered = categories.filter((c) =>
    [c.name, c.description].some((value) => value?.toLowerCase().includes(keyword)),
  )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kategori Item</h1>
          <p className="text-sm text-muted-foreground">Pengelompokan item, contoh: ATK, IT, Furniture</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing(null)}>
            <PlusIcon /> Tambah Kategori
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Cari nama atau deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="text-right">Jumlah Item</TableHead>
                {canManage && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description ?? '-'}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.itemCount}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${c.name}`} onClick={() => setDeleting(c)}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 4 : 3} className="text-center text-muted-foreground">
                    {categories.length === 0 ? 'Belum ada kategori.' : 'Tidak ada kategori yang cocok.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && (
        <ItemCategoryFormDialog
          key={editing?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          category={editing}
          onSaved={load}
        />
      )}

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus kategori ${deleting?.name}?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
