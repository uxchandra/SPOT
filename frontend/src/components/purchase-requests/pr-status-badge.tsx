import { Badge } from '@/components/ui/badge'
import type { PurchaseRequestStatus } from '@/types'

export const PR_STATUS_LABEL: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'Draft',
  IN_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Returned', // dikembalikan ke pembuat untuk revisi
  CANCELLED: 'Cancelled',
}

const STATUS_CLASS: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'bg-secondary text-secondary-foreground',
  IN_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  REJECTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  CANCELLED: 'bg-muted text-muted-foreground',
}

// Badge status Permintaan Barang
export function PrStatusBadge({ status }: { status: PurchaseRequestStatus }) {
  return <Badge className={STATUS_CLASS[status]}>{PR_STATUS_LABEL[status]}</Badge>
}
