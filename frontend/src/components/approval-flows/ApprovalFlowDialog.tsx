import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'
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
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ApproverOption, DepartmentApprovalFlow } from '@/types'

interface StepDraft {
  key: number // penanda unik baris untuk React
  name: string
  approverId: string // string karena dipakai di Select
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  flow: DepartmentApprovalFlow
  approvers: ApproverOption[]
  onSaved: () => void
}

let nextKey = 1

// Kalau department belum punya alur, mulai dari templat umum: Checked -> Approved
function initialSteps(flow: DepartmentApprovalFlow): StepDraft[] {
  if (flow.steps.length === 0) {
    return [
      { key: nextKey++, name: 'Checked', approverId: '' },
      { key: nextKey++, name: 'Approved', approverId: '' },
    ]
  }
  return flow.steps.map((s) => ({ key: nextKey++, name: s.name, approverId: String(s.approver.id) }))
}

export function ApprovalFlowDialog({ open, onOpenChange, flow, approvers, onSaved }: Props) {
  const [steps, setSteps] = useState<StepDraft[]>(() => initialSteps(flow))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Approver yang sudah nonaktif tetap ditampilkan supaya tidak hilang diam-diam
  const options = [
    ...approvers,
    ...flow.steps
      .map((s) => s.approver)
      .filter((a) => !approvers.some((o) => o.id === a.id))
      .map((a) => ({ id: a.id, name: `${a.name} (nonaktif)`, email: a.email, department: null })),
  ]

  function update(key: number, changes: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...changes } : s)))
  }

  function move(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev]
      ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const incomplete = steps.findIndex((s) => !s.name.trim() || !s.approverId)
    if (incomplete >= 0) {
      setError(`Tahap ${incomplete + 1}: nama tahap dan approver wajib diisi`)
      return
    }
    setError('')
    setSaving(true)
    try {
      await api.saveApprovalFlow(
        flow.department.id,
        steps.map((s) => ({ name: s.name, approverId: Number(s.approverId) })),
      )
      toast.success(`Alur approval ${flow.department.name} berhasil disimpan`)
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Alur Approval: {flow.department.name}</DialogTitle>
            <DialogDescription>
              Permintaan barang dari department ini akan disetujui berurutan sesuai tahap di bawah. Perubahan tidak
              memengaruhi PB yang sedang dalam proses approval.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {steps.map((step, index) => (
              <div key={step.key} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 sm:flex-nowrap">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </span>
                <Input
                  aria-label={`Nama tahap ${index + 1}`}
                  value={step.name}
                  onChange={(e) => update(step.key, { name: e.target.value })}
                  placeholder="contoh: Checked"
                  maxLength={50}
                  className="sm:w-40"
                />
                <Select value={step.approverId} onValueChange={(value) => update(step.key, { approverId: value })}>
                  <SelectTrigger aria-label={`Approver tahap ${index + 1}`} className="min-w-0 flex-1">
                    <SelectValue placeholder="Pilih approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                        {u.department && <span className="text-muted-foreground"> · {u.department.name}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Naikkan tahap ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Turunkan tahap ${index + 1}`}
                    disabled={index === steps.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus tahap ${index + 1}`}
                    onClick={() => setSteps((prev) => prev.filter((s) => s.key !== step.key))}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            ))}

            {steps.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Belum ada tahap. Tanpa alur approval, PB dari department ini tidak bisa diajukan.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => setSteps((prev) => [...prev, { key: nextKey++, name: '', approverId: '' }])}
            >
              <PlusIcon /> Tambah Tahap
            </Button>
            {error && <FieldError>{error}</FieldError>}
          </div>

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
