import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  mode: 'approve' | 'reject'
  open: boolean
  onOpenChange: (open: boolean) => void
  documentNumber: string
  onConfirm: (notes: string) => Promise<void>
}

// Dialog Setujui / Tolak. Catatan opsional saat menyetujui, wajib saat menolak.
export function ApprovalActionDialog({ mode, open, onOpenChange, documentNumber, onConfirm }: Props) {
  const isReject = mode === 'reject'
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isReject && !notes.trim()) {
      setError('Alasan wajib diisi supaya pembuat tahu apa yang harus direvisi')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onConfirm(notes)
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
            <DialogTitle>{isReject ? 'Return' : 'Approve'} PB {documentNumber}?</DialogTitle>
            <DialogDescription>
              {isReject
                ? 'PB akan dikembalikan ke pembuat untuk direvisi, lalu bisa diajukan ulang.'
                : 'PB akan diteruskan ke tahap berikutnya, atau selesai disetujui kalau ini tahap terakhir.'}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="approval-notes">{isReject ? 'Alasan dikembalikan' : 'Catatan (opsional)'}</FieldLabel>
            <Textarea
              id="approval-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isReject ? 'contoh: Jumlah terlalu banyak, mohon dicek ulang' : ''}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Processing...' : isReject ? 'Return' : 'Approve'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
