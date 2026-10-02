import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/api'

// Jumlah PB yang menunggu approval user yang sedang login.
// Dipakai untuk badge di sidebar & kartu dashboard, diperbarui berkala.
const REFRESH_INTERVAL_MS = 60_000

interface PendingApprovalsValue {
  count: number
  refresh: () => void
}

const PendingApprovalsContext = createContext<PendingApprovalsValue>({ count: 0, refresh: () => {} })

export function PendingApprovalsProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    api
      .getPendingApprovalCount()
      .then((res) => setCount(res.count))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return <PendingApprovalsContext.Provider value={{ count, refresh }}>{children}</PendingApprovalsContext.Provider>
}

export function usePendingApprovals() {
  return useContext(PendingApprovalsContext)
}
