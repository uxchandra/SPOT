import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BanIcon, CheckIcon, PencilIcon, SendIcon, Undo2Icon } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { api } from '@/api'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { ApprovalActionDialog } from '@/components/purchase-requests/ApprovalActionDialog'
import { ApprovalTimeline } from '@/components/purchase-requests/ApprovalTimeline'
import { PrStatusBadge } from '@/components/purchase-requests/pr-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDateTime, formatQuantity } from '@/lib/format'
import { usePendingApprovals } from '@/lib/pending-approvals'
import type { PurchaseRequestDetail } from '@/types'

export default function PurchaseRequestDetailPage() {
  const id = Number(useParams().id)
  const { refresh: refreshPending } = usePendingApprovals()
  const [pr, setPr] = useState<PurchaseRequestDetail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setPr(await api.getPurchaseRequest(id))
    } catch (err) {
      setLoadError((err as Error).message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const result = await api.submitPurchaseRequest(id)
      toast.success(result.message)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApproval(mode: 'approve' | 'reject', notes: string) {
    const result =
      mode === 'approve' ? await api.approvePurchaseRequest(id, notes) : await api.rejectPurchaseRequest(id, notes)
    toast.success(result.message)
    refreshPending()
    load()
  }

  async function handleCancel() {
    try {
      const result = await api.cancelPurchaseRequest(id)
      toast.success(result.message)
      load()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDialog(null)
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button asChild variant="outline">
          <Link to="/purchase-requests">Kembali ke daftar PB</Link>
        </Button>
      </div>
    )
  }
  if (!pr) return <p className="text-sm text-muted-foreground">Memuat...</p>

  // Pengajuan terakhir & riwayat pengajuan sebelumnya (kalau pernah ditolak lalu diajukan ulang)
  const latestRound = pr.approvals.filter((a) => a.round === pr.round)
  const previousRounds = [...new Set(pr.approvals.filter((a) => a.round < pr.round).map((a) => a.round))]
  const rejection = pr.status === 'REJECTED' ? latestRound.find((a) => a.status === 'REJECTED') : undefined
  const title = pr.number

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">Permintaan Barang</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <PrStatusBadge status={pr.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pr.actions.canCancel && (
            <Button variant="outline" onClick={() => setDialog('cancel')}>
              <BanIcon /> Cancel PB
            </Button>
          )}
          {pr.actions.canEdit && (
            <Button asChild variant="outline">
              <Link to={`/purchase-requests/${pr.id}/edit`}>
                <PencilIcon /> {pr.status === 'REJECTED' ? 'Revisi' : 'Edit'}
              </Link>
            </Button>
          )}
          {pr.actions.canSubmit && (
            <Button onClick={handleSubmit} disabled={submitting}>
              <SendIcon /> {submitting ? 'Submitting...' : pr.status === 'REJECTED' ? 'Resubmit' : 'Submit'}
            </Button>
          )}
          {pr.actions.canApprove && (
            <>
              <Button variant="outline" onClick={() => setDialog('reject')}>
                <Undo2Icon /> Return
              </Button>
              <Button onClick={() => setDialog('approve')}>
                <CheckIcon /> Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {pr.actions.canApprove && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          PB ini menunggu persetujuan Anda. Periksa daftar barang di bawah, lalu pilih Approve atau Return.
        </p>
      )}
      {rejection && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-950">
          <p className="font-medium text-orange-800 dark:text-orange-200">
            Returned oleh {rejection.approver.name} (tahap {rejection.stepName}) · {formatDateTime(rejection.actedAt)}
          </p>
          <p className="mt-1">Alasan: {rejection.notes}</p>
          {pr.actions.canEdit && <p className="mt-1 text-muted-foreground">Silakan revisi PB lalu Resubmit.</p>}
        </div>
      )}

      {/* Di layar sangat lebar, kartu Approval di samping; selain itu di bawah supaya tabel barang tidak terpotong */}
      <div className="grid gap-6 2xl:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi PB</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Info label="No.">{pr.number}</Info>
                <Info label="Tanggal">{formatDate(pr.requestDate)}</Info>
                <Info label="No. Tehai hyou">{pr.tehaiHyouNo ?? '-'}</Info>
                <Info label="Dept./Group">{pr.department.name}</Info>
                <Info label="No. Kode Dept./Group">{pr.department.code}</Info>
                <Info label="Dibuat oleh">{pr.createdBy.name}</Info>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Barang</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No.</TableHead>
                    <TableHead>Kode Mesin/Unit</TableHead>
                    <TableHead>Kode Account</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Kode Barang</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tgl Pemakaian</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pr.items.map((line, index) => (
                    <TableRow key={line.id ?? index}>
                      <TableCell className="tabular-nums">{index + 1}</TableCell>
                      <TableCell>{line.machine ?? '-'}</TableCell>
                      <TableCell>{line.accountCode}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal">{line.itemName}</TableCell>
                      <TableCell className="font-mono">{line.itemCode ?? '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatQuantity(line.quantity)}</TableCell>
                      <TableCell>{line.unit}</TableCell>
                      <TableCell>{formatDate(line.usageDate)}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal">{line.remarks ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Approval</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {pr.round === 0 ? (
              <p className="text-sm text-muted-foreground">PB belum diajukan.</p>
            ) : (
              <ApprovalTimeline
                approvals={latestRound}
                currentStep={pr.currentStep}
                preparedBy={pr.createdBy.name}
                submittedAt={pr.submittedAt}
              />
            )}

            {previousRounds.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                  Riwayat pengajuan sebelumnya ({previousRounds.length})
                </summary>
                <div className="mt-3 flex flex-col gap-4">
                  {previousRounds.map((round) => (
                    <div key={round} className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Pengajuan ke-{round}</p>
                      <ApprovalTimeline
                        approvals={pr.approvals.filter((a) => a.round === round)}
                        currentStep={null}
                        preparedBy={pr.createdBy.name}
                        submittedAt={null}
                      />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>

      {(dialog === 'approve' || dialog === 'reject') && (
        <ApprovalActionDialog
          mode={dialog}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          documentNumber={title}
          onConfirm={(notes) => handleApproval(dialog, notes)}
        />
      )}
      <ConfirmDeleteDialog
        open={dialog === 'cancel'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Cancel PB ${pr.number}?`}
        description="PB akan berstatus Cancelled dan tidak bisa diajukan lagi. Data & nomornya tetap tersimpan sebagai jejak."
        confirmLabel="Cancel PB"
        cancelLabel="Back"
        onConfirm={handleCancel}
      />
    </>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
