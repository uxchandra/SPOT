// Format angka ke Rupiah, contoh: 55000 -> "Rp 55.000", 55000.5 -> "Rp 55.000,50"
export function formatRupiah(value: number): string {
  const decimals = Number.isInteger(value) ? 0 : 2
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// Format tanggal "2026-08-12" -> "12 Agu 2026"
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(value),
  )
}

// Format waktu ISO -> "12 Agu 2026 14.05" (zona waktu browser)
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

// Jumlah tanpa desimal yang tidak perlu: 4 -> "4", 2.5 -> "2,5"
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)
}

// Format tanggal "2026-10-02" -> "02/10/2026"
export function formatDateDmy(value: string | null | undefined): string {
  if (!value) return '-'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
