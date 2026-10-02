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
import type { DepartmentRef, ManagedUser, Role } from '@/types'

// Select dari Radix tidak menerima value kosong, jadi "tanpa department" diwakili nilai ini
const NO_DEPARTMENT = 'none'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ManagedUser | null // null = tambah user baru
  roles: Role[]
  departments: DepartmentRef[]
  isSelf: boolean // sedang mengedit akun sendiri
  onSaved: () => void
}

export function UserFormDialog({ open, onOpenChange, user, roles, departments, isSelf, onSaved }: Props) {
  const isEdit = user !== null
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState(user ? String(user.role.id) : '')
  const [departmentId, setDepartmentId] = useState(user?.department ? String(user.department.id) : NO_DEPARTMENT)
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!roleId) {
      setError('Pilih role terlebih dahulu')
      return
    }
    setError('')
    setSaving(true)
    try {
      const data = {
        name,
        email,
        roleId: Number(roleId),
        departmentId: departmentId === NO_DEPARTMENT ? null : Number(departmentId),
        isActive,
        ...(password ? { password } : {}),
      }
      if (isEdit) await api.updateUser(user.id, data)
      else await api.createUser(data)
      toast.success(isEdit ? 'User berhasil diperbarui' : 'User berhasil ditambahkan')
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
            <DialogTitle>{isEdit ? 'Edit User' : 'Tambah User'}</DialogTitle>
            <DialogDescription>
              {isEdit ? 'Ubah data user. Kosongkan password kalau tidak ingin menggantinya.' : 'Buat akun untuk user baru.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user-name">Nama</FieldLabel>
              <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-email">Email</FieldLabel>
              <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="user-password">Password</FieldLabel>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                minLength={8}
                placeholder={isEdit ? 'Biarkan kosong jika tidak diganti' : ''}
              />
              <FieldDescription>Minimal 8 karakter.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="user-role">Role</FieldLabel>
              <Select value={roleId} onValueChange={setRoleId} disabled={isSelf}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && <FieldDescription>Anda tidak bisa mengubah role akun sendiri.</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel htmlFor="user-department">Department</FieldLabel>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="user-department" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DEPARTMENT}>— Tidak ada —</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name} <span className="text-muted-foreground">({dept.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Permintaan barang yang dibuat user ini akan atas nama department ini.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <Switch id="user-active" checked={isActive} onCheckedChange={setIsActive} disabled={isSelf} />
              <FieldLabel htmlFor="user-active">User aktif (boleh login)</FieldLabel>
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
