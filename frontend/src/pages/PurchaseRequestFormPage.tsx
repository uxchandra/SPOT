import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PlusIcon, SendIcon, Trash2Icon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { api } from '@/api'
import { DateInput } from '@/components/date-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateDmy } from '@/lib/format'
import type { PurchaseRequestFormOptions, PurchaseRequestLine } from '@/types'

interface LineDraft {
  key: number // penanda unik baris untuk React
  machine: string
  machineItemId: number | null
  accountCode: string
  itemId: number | null
  itemSearch: string // isi kolom Nama Barang (nama dari Item List atau teks bebas)
  itemCode: string // kode barang dari Item List (otomatis, kosong untuk barang manual)
  quantity: string
  unit: string
  usageDate: string
  remarks: string
}

let nextKey = 1
// Tanggal hari ini (zona waktu komputer, bukan UTC) dalam format YYYY-MM-DD
const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
// Kode account yang paling sering dipakai; otomatis terisi di baris baru (tetap bisa diubah)
const DEFAULT_ACCOUNT_CODE = '9111.1'

function emptyLine(previous?: LineDraft): LineDraft {
  // Baris baru menyalin kode account, mesin & tanggal pemakaian dari baris sebelumnya
  return {
    key: nextKey++,
    machine: previous?.machine ?? '',
    machineItemId: previous?.machineItemId ?? null,
    accountCode: previous?.accountCode || DEFAULT_ACCOUNT_CODE,
    itemId: null,
    itemSearch: '',
    itemCode: '',
    quantity: '',
    unit: 'pcs',
    usageDate: previous?.usageDate ?? '',
    remarks: '',
  }
}

function lineFromSaved(line: PurchaseRequestLine): LineDraft {
  return {
    key: nextKey++,
    machine: line.machine ?? '',
    machineItemId: line.machineItemId,
    accountCode: line.accountCode,
    itemId: line.itemId,
    itemSearch: line.itemName,
    itemCode: line.itemCode ?? '',
    quantity: String(line.quantity),
    unit: line.unit,
    usageDate: line.usageDate,
    remarks: line.remarks ?? '',
  }
}

export default function PurchaseRequestFormPage() {
  const { id } = useParams()
  const isEdit = id !== undefined
  const navigate = useNavigate()
  const [options, setOptions] = useState<PurchaseRequestFormOptions | null>(null)
  const [number, setNumber] = useState<string | null>(null)
  // Tanggal PB selalu hari ini (ditetapkan server saat disimpan); saat edit, tampil tanggal PB tersebut
  const [requestDate, setRequestDate] = useState(today)
  const [tehaiHyouNo, setTehaiHyouNo] = useState('')
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()])
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const formOptions = await api.getPurchaseRequestFormOptions()
        setOptions(formOptions)
        if (isEdit) {
          const pr = await api.getPurchaseRequest(Number(id))
          if (!pr.actions.canEdit) {
            setLoadError('PB ini tidak bisa diubah (sedang diproses, sudah disetujui, atau bukan milik Anda).')
            return
          }
          setNumber(pr.number)
          setRequestDate(pr.requestDate)
          setTehaiHyouNo(pr.tehaiHyouNo ?? '')
          setLines(pr.items.map(lineFromSaved))
        }
      } catch (err) {
        setLoadError((err as Error).message)
      }
    }
    load()
  }, [id, isEdit])

  function update(key: number, changes: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)))
  }

  // Kolom Nama Barang: kalau namanya cocok dengan item di Item List, otomatis isi kode & satuan
  function changeItem(line: LineDraft, value: string) {
    const match = options?.items.find((item) => item.name === value)
    if (match) update(line.key, { itemSearch: value, itemId: match.id, itemCode: match.code, unit: match.unit })
    // Nama diubah dari item master menjadi teks bebas: kode dari master ikut dikosongkan
    else update(line.key, { itemSearch: value, itemId: null, itemCode: line.itemId ? '' : line.itemCode })
  }


  // Kolom Kode Mesin/Unit: kalau kodenya dipilih dari Item List, otomatis isi Nama Barang, Kode Barang & Unit.
  // Kalau diketik manual (tidak ada di Item List), kolom barang tidak diubah.
  function changeMachine(line: LineDraft, value: string) {
    const match = options?.items.find((item) => item.code === value.trim())
    if (match) {
      update(line.key, {
        machine: value,
        machineItemId: match.id,
        itemId: match.id,
        itemSearch: match.name,
        itemCode: match.code,
        unit: match.unit,
      })
    } else {
      update(line.key, { machine: value, machineItemId: null })
    }
  }

  async function save(submitAfterSave: boolean) {
    setError('')
    setSaving(true)
    try {
      const data = {
        tehaiHyouNo,
        items: lines.map((l) => {
          const item = options?.items.find((i) => i.id === l.itemId)
          return {
            machine: l.machine,
            machineItemId: l.machineItemId,
            accountCode: l.accountCode,
            itemId: l.itemId,
            itemCode: l.itemCode,
            // Barang dari Item List memakai nama aslinya, barang manual memakai teks yang diketik
            itemName: item ? item.name : l.itemSearch,
            quantity: Number(l.quantity),
            unit: l.unit,
            usageDate: l.usageDate,
            remarks: l.remarks,
          }
        }),
      }
      const saved = isEdit ? await api.updatePurchaseRequest(Number(id), data) : await api.createPurchaseRequest(data)
      if (submitAfterSave) {
        // PB sudah tersimpan. Kalau pengajuan gagal, tetap pindah ke halaman detail
        // (jangan tetap di form, supaya klik ulang tidak membuat PB dobel).
        try {
          const result = await api.submitPurchaseRequest(saved.id)
          toast.success(result.message)
        } catch (err) {
          toast.error(`Draft tersimpan, tapi gagal diajukan: ${(err as Error).message}`)
        }
      } else {
        toast.success('Draft PB tersimpan')
      }
      navigate(`/purchase-requests/${saved.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    save(false)
  }

  // Perkiraan nomor PB baru dari nomor urut terakhir department di tahun tanggal PB.
  // Nomor final ditetapkan saat disimpan (bisa beda kalau ada PB lain yang tersimpan lebih dulu).
  function previewNumber() {
    if (!options?.department || !/^\d{4}-\d{2}-\d{2}$/.test(requestDate)) return ''
    const [year, month] = requestDate.split('-')
    const next = (options.lastNumbers[year] ?? 0) + 1
    return `${next}/${options.department.name}/${month}/${year}`
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
  if (!options) return <p className="text-sm text-muted-foreground">Memuat...</p>

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Permintaan Barang' : 'Buat Permintaan Barang'}</h1>
      </div>

      {!options.department && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          Akun Anda belum terhubung ke department, jadi belum bisa membuat PB. Hubungi administrator.
        </p>
      )}
      {options.department && !options.hasApprovalFlow && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Alur approval untuk department {options.department.name} belum diatur. PB bisa disimpan sebagai draft, tapi
          belum bisa diajukan.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informasi PB</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="pr-number">No.</FieldLabel>
            <Input id="pr-number" value={number ?? previewNumber()} readOnly className="bg-muted font-medium" />
            {!number && <FieldDescription></FieldDescription>}
          </Field>
          <Field>
            <FieldLabel htmlFor="pr-date">Tanggal</FieldLabel>
            <Input id="pr-date" value={formatDateDmy(requestDate)} readOnly className="bg-muted" />
          </Field>
          <Field>
            <FieldLabel htmlFor="pr-tehai">No. Tehai hyou</FieldLabel>
            <Input
              id="pr-tehai"
              value={tehaiHyouNo}
              onChange={(e) => setTehaiHyouNo(e.target.value)}
              placeholder="Opsional"
              maxLength={50}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pr-dept">Dept./Group</FieldLabel>
            <Input id="pr-dept" value={options.department?.name ?? '-'} readOnly className="bg-muted" />
          </Field>
          <Field>
            <FieldLabel htmlFor="pr-dept-code">No. Kode Dept./Group</FieldLabel>
            <Input id="pr-dept-code" value={options.department?.code ?? '-'} readOnly className="bg-muted" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Barang</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Saran untuk kolom Nama Barang: yang terisi hanya namanya, kode tampil sebagai petunjuk */}
          <datalist id="item-options">
            {options.items.map((item) => (
              <option key={item.id} value={item.name}>
                {item.code}
              </option>
            ))}
          </datalist>
          {/* Saran untuk kolom Kode Mesin/Unit: yang terisi hanya kodenya, nama tampil sebagai petunjuk */}
          <datalist id="code-options">
            {options.items.map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </datalist>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No.</TableHead>
                <TableHead className="min-w-44">Kode Mesin/Unit</TableHead>
                <TableHead className="min-w-28">Kode Account</TableHead>
                <TableHead className="min-w-64">Nama Barang</TableHead>
                <TableHead className="min-w-24">Kode Barang</TableHead>
                <TableHead className="min-w-24">Jumlah</TableHead>
                <TableHead className="min-w-24">Unit</TableHead>
                <TableHead className="min-w-40">Tanggal Pemakaian</TableHead>
                <TableHead className="min-w-56">Keterangan</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => {
                const masterItem = options.items.find((i) => i.id === line.itemId)
                return (
                  <TableRow key={line.key} className="align-top">
                    <TableCell className="pt-4 tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Kode mesin/unit baris ${index + 1}`}
                        list="code-options"
                        value={line.machine}
                        onChange={(e) => changeMachine(line, e.target.value)}
                        placeholder="contoh: Tapping 01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Kode account baris ${index + 1}`}
                        value={line.accountCode}
                        onChange={(e) => update(line.key, { accountCode: e.target.value })}
                        placeholder="9111.1"
                        maxLength={30}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Nama barang baris ${index + 1}`}
                        list="item-options"
                        value={line.itemSearch}
                        onChange={(e) => changeItem(line, e.target.value)}
                        placeholder="Cari di Item List atau ketik manual"
                        required
                      />
                      {line.itemSearch && !masterItem && (
                        <p className="mt-1 text-xs text-muted-foreground">Barang manual (di luar Item List)</p>
                      )}
                    </TableCell>
                    <TableCell className="pt-4 font-mono text-sm" aria-label={`Kode barang baris ${index + 1}`}>
                      {masterItem?.code ?? <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Jumlah baris ${index + 1}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={line.quantity}
                        onChange={(e) => update(line.key, { quantity: e.target.value })}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={line.unit} onValueChange={(value) => update(line.key, { unit: value })}>
                        <SelectTrigger aria-label={`Unit baris ${index + 1}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.units.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DateInput
                        aria-label={`Tanggal pemakaian baris ${index + 1}`}
                        value={line.usageDate}
                        onChange={(value) => update(line.key, { usageDate: value })}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Keterangan baris ${index + 1}`}
                        value={line.remarks}
                        onChange={(e) => update(line.key, { remarks: e.target.value })}
                        placeholder="contoh: U/ Perbaikan MC"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus baris ${index + 1}`}
                        disabled={lines.length === 1}
                        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => setLines((prev) => [...prev, emptyLine(prev[prev.length - 1])])}
          >
            <PlusIcon /> Add Row
          </Button>
        </CardContent>
      </Card>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button type="submit" variant="outline" disabled={saving || !options.department}>
          Save Draft
        </Button>
        <Button
          type="button"
          disabled={saving || !options.department || !options.hasApprovalFlow}
          onClick={(e) => {
            // Jalankan validasi bawaan browser dulu (kolom wajib), baru simpan & ajukan
            const form = e.currentTarget.form
            if (form && !form.reportValidity()) return
            save(true)
          }}
        >
          <SendIcon /> {saving ? 'Saving...' : 'Save & Submit'}
        </Button>
      </div>
    </form>
  )
}
