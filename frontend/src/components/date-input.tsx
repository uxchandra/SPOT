import { useEffect, useRef, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { id as localeId } from 'react-day-picker/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// "2026-10-02" -> "02/10/2026"
function toDisplay(iso: string) {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `${day}/${month}/${year}` : ''
}

// "02/10/2026" -> "2026-10-02", atau null kalau tanggalnya tidak valid
function toIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const valid =
    date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
  return valid ? `${year}-${month}-${day}` : null
}

// Saat mengetik angka, garis miring disisipkan otomatis: 02102026 -> 02/10/2026
function autoFormat(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/')
}

const isoToDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const dateToIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

interface Props {
  value: string // format YYYY-MM-DD, atau "" kalau kosong
  onChange: (value: string) => void
  id?: string
  'aria-label'?: string
  required?: boolean
}

// Input tanggal dengan format dd/mm/yyyy (tidak bergantung pada bahasa browser) + kalender untuk memilih.
export function DateInput({ value, onChange, id, required, ...props }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => toDisplay(value))
  const [syncedValue, setSyncedValue] = useState(value)

  // Kalau nilai diubah dari luar (contoh: data PB dimuat), tampilan ikut diperbarui
  if (value !== syncedValue) {
    setSyncedValue(value)
    setText(toDisplay(value))
  }

  // Pesan validasi bawaan browser untuk tanggal yang belum lengkap / tidak valid
  useEffect(() => {
    let message = ''
    if (text && !toIso(text)) {
      // Lengkap tapi tanggalnya tidak ada (contoh 31/02/2026) vs. belum lengkap
      message = text.length === 10 ? 'Tanggal tidak valid' : 'Format tanggal dd/mm/yyyy, contoh 02/10/2026'
    }
    inputRef.current?.setCustomValidity(message)
  }, [text])

  function handleType(raw: string) {
    const formatted = autoFormat(raw)
    setText(formatted)
    const iso = toIso(formatted)
    if (iso) {
      setSyncedValue(iso)
      onChange(iso)
    } else if (formatted === '') {
      setSyncedValue('')
      onChange('')
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        aria-label={props['aria-label']}
        value={text}
        onChange={(e) => handleType(e.target.value)}
        placeholder="dd/mm/yyyy"
        inputMode="numeric"
        required={required}
        className="pr-9"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-0.5 -translate-y-1/2"
            aria-label="Pilih tanggal dari kalender"
          >
            <CalendarIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            locale={localeId}
            selected={value ? isoToDate(value) : undefined}
            defaultMonth={value ? isoToDate(value) : undefined}
            onSelect={(date) => {
              if (!date) return
              const iso = dateToIso(date)
              setSyncedValue(iso)
              setText(toDisplay(iso))
              onChange(iso)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
