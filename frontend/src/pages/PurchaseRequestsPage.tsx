import { useCallback, useEffect, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { api } from '@/api'
import { PR_STATUS_LABEL, PrStatusBadge } from '@/components/purchase-requests/pr-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { usePendingApprovals } from '@/lib/pending-approvals'
import type { PurchaseRequestStatus, PurchaseRequestSummary } from '@/types'

type Scope = 'all' | 'pending'
const ALL_STATUS = 'all'

export default function PurchaseRequestsPage() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const { count: pendingCount, refresh: refreshPending } = usePendingApprovals()
  // Tab aktif disimpan di URL (?tab=pending) supaya bisa dibagikan/di-bookmark
  const [searchParams, setSearchParams] = useSearchParams()
  // Tab Waiting Approval hanya untuk approver. Tetap tampil juga kalau masih ada PB yang menunggu user ini
  // (contoh: sudah dihapus dari alur approval, tapi PB lama masih di tahapnya).
  const showPendingTab = user?.isApprover === true || pendingCount > 0
  const scope: Scope = showPendingTab && searchParams.get('tab') === 'pending' ? 'pending' : 'all'
  const [requests, setRequests] = useState<PurchaseRequestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRequests(await api.getPurchaseRequests(scope))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    load()
    refreshPending()
  }, [load, refreshPending])

  const keyword = search.trim().toLowerCase()
  const filtered = requests.filter(
    (pr) =>
      (statusFilter === ALL_STATUS || pr.status === statusFilter) &&
      [pr.number, pr.department.name, pr.createdBy.name].some((value) => value?.toLowerCase().includes(keyword)),
  )

  const canCreate = can('purchase_request.create')

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Permintaan Barang</h1>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/purchase-requests/new">
              <PlusIcon /> New PB
            </Link>
          </Button>
        )}
      </div>

      {canCreate && !user?.department && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Akun Anda belum terhubung ke department, jadi belum bisa membuat PB. Hubungi administrator.
        </p>
      )}

      {showPendingTab && (
        <Tabs value={scope} onValueChange={(value) => setSearchParams(value === 'pending' ? { tab: 'pending' } : {})}>
          <TabsList>
            <TabsTrigger value="all">List PB</TabsTrigger>
            <TabsTrigger value="pending">
              Waiting Approval
              {pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-xs text-white tabular-nums">{pendingCount}</span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Cari nomor, department, atau pembuat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {scope === 'all' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-52" aria-label="Filter status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS}>All status</SelectItem>
                  {(Object.keys(PR_STATUS_LABEL) as PurchaseRequestStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {PR_STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. PB</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Dibuat oleh</TableHead>
                <TableHead>Barang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pr) => (
                <TableRow
                  key={pr.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/purchase-requests/${pr.id}`)}
                >
                  <TableCell className="font-medium">
                    {pr.number}
                  </TableCell>
                  <TableCell>{formatDate(pr.requestDate)}</TableCell>
                  <TableCell>{pr.department.name}</TableCell>
                  <TableCell>{pr.createdBy.name}</TableCell>
                  <TableCell className="tabular-nums">{pr.itemCount}</TableCell>
                  <TableCell>
                    {/* Badge hanya untuk status; nama approver yang sedang ditunggu ditulis di sampingnya */}
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <PrStatusBadge status={pr.status} />
                      {pr.currentApproval && <span className="text-sm">: {pr.currentApproval.approver.name}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant={scope === 'pending' ? 'default' : 'outline'} size="sm">
                      <Link to={`/purchase-requests/${pr.id}`} onClick={(e) => e.stopPropagation()}>
                        {scope === 'pending' ? 'Review' : 'View'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {scope === 'pending'
                      ? 'Tidak ada PB yang menunggu approval Anda.'
                      : requests.length === 0
                        ? 'Belum ada permintaan barang.'
                        : 'Tidak ada PB yang cocok.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
