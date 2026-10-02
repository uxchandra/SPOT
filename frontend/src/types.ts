// Tipe ini harus sama dengan bentuk JSON dari backend

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  permissions: string[]
  department: DepartmentRef | null // department tempat user bekerja
  isApprover: boolean // ditunjuk sebagai approver di salah satu alur approval
}

export interface DepartmentRef {
  id: number
  code: string
  name: string
}

// ===== Data Master =====

export interface UserOption {
  id: number
  name: string
  email: string
}

export interface Department {
  id: number
  code: string
  name: string
  description: string | null
  position: string | null // jabatan penanggung jawab
  user: UserOption | null // user yang memegang jabatan tersebut
  createdAt: string
}

export interface DepartmentInput {
  code: string
  name: string
  description: string
  position: string
  userId: number | null
}

// ===== Manajemen User =====

export interface ManagedUser {
  id: number
  name: string
  email: string
  isActive: boolean
  createdAt: string
  role: { id: number; name: string }
  department: DepartmentRef | null
}

export interface UserInput {
  name: string
  email: string
  password?: string // saat edit: kosongkan kalau tidak ingin ganti password
  roleId: number
  departmentId: number | null
  isActive: boolean
}

export interface Role {
  id: number
  name: string
  description: string | null
  isSystem: boolean // role admin: tidak bisa diubah/dihapus
  userCount: number
  permissions: string[]
}

export interface RoleInput {
  name: string
  description: string
  permissions: string[]
}

export interface PermissionOption {
  name: string
  description: string | null
  group: string
}

export interface ItemCategory {
  id: number
  name: string
  description: string | null
  itemCount: number // jumlah item di kategori ini
}

export interface ItemCategoryInput {
  name: string
  description: string
}

export interface Supplier {
  id: number
  code: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  npwp: string | null
  isActive: boolean
  itemCount: number // jumlah item yang memakai supplier ini sebagai supplier utama
}

export interface SupplierInput {
  code: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  npwp: string
  isActive: boolean
}

export interface Item {
  id: number
  code: string
  name: string
  unit: string
  price: number // harga acuan
  brand: string | null
  specification: string | null
  isActive: boolean
  category: { id: number; name: string }
  supplier: { id: number; code: string; name: string; isActive: boolean } | null
}

export interface ItemInput {
  code: string
  name: string
  categoryId: number
  unit: string
  price: number
  brand: string
  specification: string
  supplierId: number | null
  isActive: boolean
}

// Pilihan untuk form item
export interface ItemFormOptions {
  units: string[]
  categories: { id: number; name: string }[]
  suppliers: { id: number; code: string; name: string }[]
}

// ===== Alur Approval =====

export interface ApprovalFlowStep {
  stepOrder: number
  name: string // contoh: Checked, Approved
  approver: { id: number; name: string; email: string; isActive: boolean }
}

export interface DepartmentApprovalFlow {
  department: DepartmentRef & { description: string | null }
  steps: ApprovalFlowStep[]
}

export interface ApproverOption {
  id: number
  name: string
  email: string
  department: { name: string } | null
}

// ===== Transaksi: Permintaan Barang =====

export type PurchaseRequestStatus = 'DRAFT' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface PurchaseRequestLine {
  id?: number
  machine: string | null // kode/nama mesin atau unit
  machineItemId: number | null
  accountCode: string
  itemId: number | null // terisi kalau barang dipilih dari Item List
  itemCode: string | null
  itemName: string
  quantity: number
  unit: string
  usageDate: string // YYYY-MM-DD
  remarks: string | null
}

export interface PurchaseRequestSummary {
  id: number
  number: string // contoh 101/PUD/08/2026, diberikan saat PB pertama kali disimpan
  requestDate: string
  status: PurchaseRequestStatus
  department: DepartmentRef
  createdBy: { id: number; name: string }
  itemCount: number
  currentApproval: { stepName: string; approver: { id: number; name: string } } | null
  updatedAt: string
}

export interface DocumentApproval {
  id: number
  round: number // pengajuan ke-berapa
  stepOrder: number
  stepName: string
  approver: { id: number; name: string }
  status: ApprovalStatus
  notes: string | null
  actedAt: string | null
}

export interface PurchaseRequestDetail {
  id: number
  number: string
  requestDate: string
  tehaiHyouNo: string | null
  status: PurchaseRequestStatus
  round: number
  currentStep: number | null
  department: DepartmentRef
  createdBy: { id: number; name: string }
  submittedAt: string | null
  approvedAt: string | null
  createdAt: string
  items: PurchaseRequestLine[]
  approvals: DocumentApproval[]
  actions: { canEdit: boolean; canSubmit: boolean; canCancel: boolean; canApprove: boolean }
}

export interface PurchaseRequestInput {
  tehaiHyouNo: string // tanggal PB tidak dikirim: selalu hari ini (ditetapkan server)
  items: Omit<PurchaseRequestLine, 'id'>[]
}

export interface PurchaseRequestFormOptions {
  units: string[]
  items: { id: number; code: string; name: string; unit: string }[]
  department: DepartmentRef | null
  hasApprovalFlow: boolean
  lastNumbers: Record<string, number> // nomor urut terakhir per tahun, untuk perkiraan nomor PB baru
}
