import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { api } from '@/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { PermissionOption, Role } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null // null = tambah role baru
  permissions: PermissionOption[]
  onSaved: () => void
}

// Kelompokkan permission per modul, contoh: { "Purchase Order": [...], "Manajemen User": [...] }
function groupPermissions(permissions: PermissionOption[]) {
  const groups = new Map<string, PermissionOption[]>()
  for (const p of permissions) {
    groups.set(p.group, [...(groups.get(p.group) ?? []), p])
  }
  return [...groups.entries()]
}

export function RoleFormDialog({ open, onOpenChange, role, permissions, onSaved }: Props) {
  const isEdit = role !== null
  const readOnly = role?.isSystem ?? false
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(names: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const n of names) {
        if (checked) next.add(n)
        else next.delete(n)
      }
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = { name, description, permissions: [...selected] }
      if (isEdit) await api.updateRole(role.id, data)
      else await api.createRole(data)
      toast.success(isEdit ? 'Role berhasil diperbarui' : 'Role berhasil ditambahkan')
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
            <DialogTitle>{readOnly ? 'Detail Role' : isEdit ? 'Edit Role' : 'Tambah Role'}</DialogTitle>
            <DialogDescription>
              {readOnly
                ? 'Role admin adalah role sistem: selalu punya semua permission dan tidak bisa diubah.'
                : 'Tentukan nama role dan centang permission yang dimiliki role ini.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="role-name">Nama Role</FieldLabel>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                placeholder="contoh: purchasing"
                disabled={readOnly}
                required
              />
              <FieldDescription>Huruf kecil, angka, tanda - atau _.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="role-description">Deskripsi</FieldLabel>
              <Input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly}
              />
            </Field>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium">Permission</p>
              {groupPermissions(permissions).map(([group, items]) => {
                const names = items.map((p) => p.name)
                const checkedCount = names.filter((n) => selected.has(n)).length
                const groupId = `group-${group.replace(/\s+/g, '-')}`
                return (
                  <div key={group} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center gap-2 border-b pb-2">
                      <Checkbox
                        id={groupId}
                        checked={checkedCount === names.length ? true : checkedCount > 0 ? 'indeterminate' : false}
                        onCheckedChange={(checked) => toggle(names, checked === true)}
                        disabled={readOnly}
                      />
                      <label htmlFor={groupId} className="text-sm font-medium">
                        {group}
                      </label>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {checkedCount}/{names.length}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((p) => (
                        <div key={p.name} className="flex items-start gap-2">
                          <Checkbox
                            id={`perm-${p.name}`}
                            checked={selected.has(p.name)}
                            onCheckedChange={(checked) => toggle([p.name], checked === true)}
                            disabled={readOnly}
                          />
                          <label htmlFor={`perm-${p.name}`} className="grid gap-0.5 text-sm leading-tight">
                            <span>{p.description ?? p.name}</span>
                            <code className="text-xs text-muted-foreground">{p.name}</code>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? 'Tutup' : 'Batal'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
