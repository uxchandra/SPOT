import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronRightIcon, PencilIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/api'
import { ApprovalFlowDialog } from '@/components/approval-flows/ApprovalFlowDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ApproverOption, DepartmentApprovalFlow } from '@/types'

export default function ApprovalFlowsPage() {
  const [flows, setFlows] = useState<DepartmentApprovalFlow[]>([])
  const [approvers, setApprovers] = useState<ApproverOption[]>([])
  const [editing, setEditing] = useState<DepartmentApprovalFlow | null>(null)

  const load = useCallback(async () => {
    try {
      const [flowList, userList] = await Promise.all([api.getApprovalFlows(), api.getApproverOptions()])
      setFlows(flowList)
      setApprovers(userList)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Alur Approval</h1>
        <p className="text-sm text-muted-foreground">
          Tahap persetujuan Permintaan Barang untuk setiap department, contoh: Checked → Approved
        </p>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Department</TableHead>
                <TableHead>Tahap Approval</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows.map((flow) => (
                <TableRow key={flow.department.id}>
                  <TableCell>
                    <div className="grid leading-tight">
                      <span className="font-medium">{flow.department.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {flow.department.code}
                        {flow.department.description && ` · ${flow.department.description}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {flow.steps.length === 0 ? (
                      <Badge variant="secondary">Belum diatur</Badge>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {flow.steps.map((step, index) => (
                          <Fragment key={step.stepOrder}>
                            {index > 0 && <ChevronRightIcon className="size-4 text-muted-foreground" />}
                            <span className="rounded-md border px-2 py-1 text-sm">
                              <span className="font-medium">{step.name}</span>
                              <span className="text-muted-foreground"> · {step.approver.name}</span>
                              {!step.approver.isActive && <span className="text-destructive"> (nonaktif)</span>}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Atur alur approval ${flow.department.name}`}
                      onClick={() => setEditing(flow)}
                    >
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {flows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Belum ada department. Tambahkan dulu di menu Data Master → Department.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <ApprovalFlowDialog
          key={editing.department.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          flow={editing}
          approvers={approvers}
          onSaved={load}
        />
      )}
    </>
  )
}
