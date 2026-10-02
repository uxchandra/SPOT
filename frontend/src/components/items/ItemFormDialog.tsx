import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { api } from '@/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatRupiah } from '@/lib/format'
import type { Item, ItemFormOptions } from '@/types'

// Select dari Radix tidak menerima value kosong, jadi "tanpa supplier" diwakili nilai ini
const NO_SUPPLIER = 'none'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Item | null // null = tambah item baru
  options: ItemFormOptions
  onSaved: () => void
}

export function ItemFormDialog({ open, onOpenChange, item, options, onSaved }: Props) {
  const isEdit = item !== null
  const [code, setCode] = useState(item?.code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [categoryId, setCategoryId] = useState(item ? String(item.category.id) : '')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [brand, setBrand] = useState(item?.brand ?? '')
  const [specification, setSpecification] = useState(item?.specification ?? '')
  const [supplierId, setSupplierId] = useState(item?.supplier ? String(item.supplier.id) : NO_SUPPLIER)
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Supplier yang sedang terpasang tetap ditampilkan walaupun sudah nonaktif
  const supplierOptions =
    item?.supplier && !options.suppliers.some((s) => s.id === item.supplier!.id)
      ? [item.supplier, ...options.suppliers]
      : options.suppliers

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!categoryId || !unit) {
      setError('Kategori dan satuan wajib dipilih')
      return
    }
    setError('')
    setSaving(true)
    try {
      const data = {
        code,
        name,
        categoryId: Number(categoryId),
        unit,
        price: Number(price),
        brand,
        specification,
        supplierId: supplierId === NO_SUPPLIER ? null : Number(supplierId),
        isActive,
      }
      if (isEdit) await api.updateItem(item.id, data)
      else await api.createItem(data)
      toast.success(isEdit ? 'Item berhasil diperbarui' : 'Item berhasil ditambahkan')
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Item' : 'Tambah Item'}</DialogTitle>
            <DialogDescription>Daftar barang yang bisa dipesan lewat Purchase Order.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <Field>
                <FieldLabel htmlFor="item-code">Kode</FieldLabel>
                <Input
                  id="item-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ATK-001"
                  maxLength={30}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="item-name">Nama</FieldLabel>
                <Input
                  id="item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="contoh: Kertas A4 80gr"
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="item-category">Kategori</FieldLabel>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="item-category" className="w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {options.categories.length === 0 && (
                  <FieldDescription>Belum ada kategori. Tambahkan dulu di menu Kategori Item.</FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="item-brand">Merk</FieldLabel>
                <Input id="item-brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="item-unit">Satuan</FieldLabel>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="item-unit" className="w-full">
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.units.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="item-price">Harga Satuan (Rp)</FieldLabel>
                <Input
                  id="item-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  required
                />
                <FieldDescription>{price ? formatRupiah(Number(price)) : 'Harga acuan'}</FieldDescription>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="item-supplier">Supplier Utama</FieldLabel>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="item-supplier" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>— Tidak ada —</SelectItem>
                  {supplierOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} <span className="text-muted-foreground">({s.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="item-specification">Spesifikasi</FieldLabel>
              <Textarea
                id="item-specification"
                rows={3}
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="contoh: 80gsm, 500 lembar per rim"
              />
            </Field>
            <Field orientation="horizontal">
              <Switch id="item-active" checked={isActive} onCheckedChange={setIsActive} />
              <FieldLabel htmlFor="item-active">Aktif</FieldLabel>
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
