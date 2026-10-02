import { Badge } from '@/components/ui/badge'

// Badge status Aktif / Nonaktif
export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Aktif</Badge>
  ) : (
    <Badge variant="secondary">Nonaktif</Badge>
  )
}
