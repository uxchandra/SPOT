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
import type { Department, UserOption } from '@/types'

// Select dari Radix tidak menerima value kosong, jadi "tidak ada user" diwakili nilai ini
const NO_USER = 'none'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: Department | null // null = tambah department baru
  userOptions: UserOption[] // user aktif yang bisa dipilih
  onSaved: () => void
}

export function DepartmentFormDialog({ open, onOpenChange, department, userOptions, onSaved }: Props) {
  const isEdit = department !== null
  const [code, setCode] = useState(department?.code ?? '')
  const [name, setName] = useState(department?.name ?? '')
  const [description, setDescription] = useState(department?.description ?? '')
  const [position, setPosition] = useState(department?.position ?? '')
  const [userId, setUserId] = useState(department?.user ? String(department.user.id) : NO_USER)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // User yang sedang memegang jabatan tetap ditampilkan walaupun sudah nonaktif
  const options =
    department?.user && !userOptions.some((u) => u.id === department.user!.id)
      ? [department.user, ...userOptions]
      : userOptions

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = { code, name, description, position, userId: userId === NO_USER ? null : Number(userId) }
      if (isEdit) await api.updateDepartment(department.id, data)
      else await api.createDepartment(data)
      toast.success(isEdit ? 'Department berhasil diperbarui' : 'Department berhasil ditambahkan')
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
            <DialogTitle>{isEdit ? 'Edit Department' : 'Tambah Department'}</DialogTitle>
            <DialogDescription>Data department digunakan di seluruh aplikasi.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="dept-code">Kode</FieldLabel>
              <Input
                id="dept-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="contoh: FIN"
                maxLength={20}
                required
              />
              <FieldDescription>Huruf, angka, tanda - atau _ (maksimal 20 karakter).</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="dept-name">Nama</FieldLabel>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="contoh: Finance"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dept-description">Deskripsi</FieldLabel>
              <Input id="dept-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="dept-position">Jabatan</FieldLabel>
              <Input
                id="dept-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="contoh: Finance Manager"
                maxLength={100}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dept-user">User</FieldLabel>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="dept-user" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_USER}>— Belum ada —</SelectItem>
                  {options.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} <span className="text-muted-foreground">({u.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>User yang memegang jabatan di department ini.</FieldDescription>
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
