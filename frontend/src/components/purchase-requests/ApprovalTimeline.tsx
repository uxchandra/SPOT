import { CheckIcon, CircleIcon, MinusIcon, PencilLineIcon, Undo2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatDateTime } from '@/lib/format'
import type { ApprovalStatus, DocumentApproval } from '@/types'

const STATUS_STYLE: Record<ApprovalStatus, { icon: ReactNode; className: string; label: string }> = {
  PENDING: { icon: <CircleIcon />, className: 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950', label: 'Pending' },
  APPROVED: { icon: <CheckIcon />, className: 'border-emerald-500 bg-emerald-500 text-white', label: 'Approved' },
  REJECTED: { icon: <Undo2Icon />, className: 'border-orange-500 bg-orange-500 text-white', label: 'Returned' },
  CANCELLED: { icon: <MinusIcon />, className: 'border-border bg-muted text-muted-foreground', label: 'Cancelled' },
}

interface Props {
  approvals: DocumentApproval[] // tahap-tahap dalam satu pengajuan, urut stepOrder
  currentStep: number | null // tahap yang sedang aktif (kalau masih proses)
  preparedBy: string // pembuat PB (= Prepared)
  submittedAt: string | null // kosong untuk riwayat pengajuan lama (waktu pengajuannya tidak disimpan per pengajuan)
}

// Timeline approval satu pengajuan: Prepared -> tahap 1 -> tahap 2 -> ...
export function ApprovalTimeline({ approvals, currentStep, preparedBy, submittedAt }: Props) {
  return (
    <ol className="flex flex-col">
      <TimelineRow
        icon={<PencilLineIcon />}
        className="border-primary bg-primary text-primary-foreground"
        title="Prepared"
        person={preparedBy}
        detail={submittedAt ? `Submitted ${formatDateTime(submittedAt)}` : 'Submitted'}
        last={approvals.length === 0}
      />
      {approvals.map((a, index) => {
        const style = STATUS_STYLE[a.status]
        const isCurrent = a.status === 'PENDING' && a.stepOrder === currentStep
        return (
          <TimelineRow
            key={a.id}
            icon={style.icon}
            className={style.className}
            title={a.stepName}
            person={a.approver.name}
            detail={
              a.actedAt
                ? `${style.label} ${formatDateTime(a.actedAt)}`
                : isCurrent
                  ? 'Waiting for approval'
                  : style.label
            }
            notes={a.notes}
            highlight={isCurrent}
            last={index === approvals.length - 1}
          />
        )
      })}
    </ol>
  )
}

function TimelineRow(props: {
  icon: ReactNode
  className: string
  title: string
  person: string
  detail: string
  notes?: string | null
  highlight?: boolean
  last: boolean
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Garis penghubung antar tahap */}
      {!props.last && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-border" aria-hidden />}
      <span
        className={`relative flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4 ${props.className}`}
      >
        {props.icon}
      </span>
      <div className={`grid flex-1 gap-0.5 ${props.highlight ? 'rounded-md bg-amber-50 px-2 py-1 dark:bg-amber-950/40' : ''}`}>
        <p className="text-sm">
          <span className="font-medium">{props.title}</span>
          <span className="text-muted-foreground"> · {props.person}</span>
        </p>
        <p className="text-xs text-muted-foreground">{props.detail}</p>
        {props.notes && <p className="mt-1 rounded-md border bg-muted/50 px-2 py-1 text-sm">“{props.notes}”</p>}
      </div>
    </li>
  )
}
