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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Supplier } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null // null = tambah supplier baru
  onSaved: () => void
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: Props) {
  const isEdit = supplier !== null
  const [code, setCode] = useState(supplier?.code ?? '')
  const [name, setName] = useState(supplier?.name ?? '')
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [address, setAddress] = useState(supplier?.address ?? '')
  const [npwp, setNpwp] = useState(supplier?.npwp ?? '')
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = { code, name, contactPerson, phone, email, address, npwp, isActive }
      if (isEdit) await api.updateSupplier(supplier.id, data)
      else await api.createSupplier(data)
      toast.success(isEdit ? 'Supplier berhasil diperbarui' : 'Supplier berhasil ditambahkan')
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
            <DialogTitle>{isEdit ? 'Edit Supplier' : 'Tambah Supplier'}</DialogTitle>
            <DialogDescription>Data pemasok barang untuk Purchase Order.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <Field>
                <FieldLabel htmlFor="supplier-code">Kode</FieldLabel>
                <Input
                  id="supplier-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUP-001"
                  maxLength={20}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="supplier-name">Nama</FieldLabel>
                <Input
                  id="supplier-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="contoh: PT Sinar Jaya"
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="supplier-contact">Contact Person</FieldLabel>
                <Input id="supplier-contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="supplier-phone">Telepon</FieldLabel>
                <Input
                  id="supplier-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="supplier-email">Email</FieldLabel>
              <Input id="supplier-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-address">Alamat</FieldLabel>
              <Textarea id="supplier-address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="supplier-npwp">NPWP</FieldLabel>
              <Input
                id="supplier-npwp"
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                placeholder="01.234.567.8-901.000"
                maxLength={25}
              />
              <FieldDescription>Boleh dikosongkan.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Switch id="supplier-active" checked={isActive} onCheckedChange={setIsActive} />
              <FieldLabel htmlFor="supplier-active">Aktif (bisa dipilih di item & PO)</FieldLabel>
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
