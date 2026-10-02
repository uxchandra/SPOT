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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ItemCategory } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ItemCategory | null // null = tambah kategori baru
  onSaved: () => void
}

export function ItemCategoryFormDialog({ open, onOpenChange, category, onSaved }: Props) {
  const isEdit = category !== null
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = { name, description }
      if (isEdit) await api.updateItemCategory(category.id, data)
      else await api.createItemCategory(data)
      toast.success(isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan')
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
            <DialogDescription>Kategori dipakai untuk mengelompokkan item.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="category-name">Nama</FieldLabel>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: ATK"
                maxLength={100}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="category-description">Deskripsi</FieldLabel>
              <Input
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="contoh: Alat tulis kantor"
              />
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
