import type {
  ApproverOption,
  AuthUser,
  DepartmentApprovalFlow,
  DepartmentRef,
  Department,
  DepartmentInput,
  Item,
  ItemCategory,
  ItemCategoryInput,
  ItemFormOptions,
  ItemInput,
  ManagedUser,
  PermissionOption,
  PurchaseRequestDetail,
  PurchaseRequestFormOptions,
  PurchaseRequestInput,
  PurchaseRequestSummary,
  Role,
  RoleInput,
  Supplier,
  SupplierInput,
  UserInput,
  UserOption,
} from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Dipanggil saat backend membalas 401 (belum login / sesi habis)
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

const SERVER_UNREACHABLE = 'Tidak dapat terhubung ke server. Pastikan backend sudah berjalan (npm run dev di folder backend).'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // Cookie login ikut terkirim otomatis karena frontend & backend satu origin (lewat proxy Vite)
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    // fetch gagal total: jaringan putus atau server tidak bisa dihubungi
    throw new ApiError(SERVER_UNREACHABLE, 0)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 401 && !url.startsWith('/api/auth/')) onUnauthorized()
    // Error 5xx tanpa pesan dari backend = biasanya proxy Vite gagal meneruskan karena backend mati
    if (!body.message && res.status >= 500) throw new ApiError(SERVER_UNREACHABLE, res.status)
    throw new ApiError(body.message ?? `Request gagal (${res.status})`, res.status)
  }
  return res.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<AuthUser>('/api/auth/me'),

  // Data master: department
  getDepartments: () => request<Department[]>('/api/departments'),
  getDepartmentUserOptions: () => request<UserOption[]>('/api/departments/user-options'),
  createDepartment: (data: DepartmentInput) =>
    request<Department>('/api/departments', { method: 'POST', body: JSON.stringify(data) }),
  updateDepartment: (id: number, data: DepartmentInput) =>
    request<Department>(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDepartment: (id: number) =>
    request<{ message: string }>(`/api/departments/${id}`, { method: 'DELETE' }),

  // Data master: kategori item
  getItemCategories: () => request<ItemCategory[]>('/api/item-categories'),
  createItemCategory: (data: ItemCategoryInput) =>
    request<ItemCategory>('/api/item-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateItemCategory: (id: number, data: ItemCategoryInput) =>
    request<ItemCategory>(`/api/item-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItemCategory: (id: number) =>
    request<{ message: string }>(`/api/item-categories/${id}`, { method: 'DELETE' }),

  // Data master: supplier
  getSuppliers: () => request<Supplier[]>('/api/suppliers'),
  createSupplier: (data: SupplierInput) =>
    request<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: SupplierInput) =>
    request<Supplier>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: number) => request<{ message: string }>(`/api/suppliers/${id}`, { method: 'DELETE' }),

  // Data master: item
  getItems: () => request<Item[]>('/api/items'),
  getItemFormOptions: () => request<ItemFormOptions>('/api/items/form-options'),
  createItem: (data: ItemInput) => request<Item>('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: number, data: ItemInput) =>
    request<Item>(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id: number) => request<{ message: string }>(`/api/items/${id}`, { method: 'DELETE' }),

  // Transaksi: permintaan barang
  getPurchaseRequests: (scope: 'all' | 'pending' = 'all') =>
    request<PurchaseRequestSummary[]>(`/api/purchase-requests?scope=${scope}`),
  getPurchaseRequest: (id: number) => request<PurchaseRequestDetail>(`/api/purchase-requests/${id}`),
  getPurchaseRequestFormOptions: () => request<PurchaseRequestFormOptions>('/api/purchase-requests/form-options'),
  getPendingApprovalCount: () => request<{ count: number }>('/api/purchase-requests/pending-count'),
  createPurchaseRequest: (data: PurchaseRequestInput) =>
    request<{ id: number; number: string }>('/api/purchase-requests', { method: 'POST', body: JSON.stringify(data) }),
  updatePurchaseRequest: (id: number, data: PurchaseRequestInput) =>
    request<{ id: number }>(`/api/purchase-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelPurchaseRequest: (id: number) =>
    request<{ message: string }>(`/api/purchase-requests/${id}/cancel`, { method: 'POST' }),
  submitPurchaseRequest: (id: number) =>
    request<{ message: string; number: string }>(`/api/purchase-requests/${id}/submit`, { method: 'POST' }),
  approvePurchaseRequest: (id: number, notes: string) =>
    request<{ message: string }>(`/api/purchase-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
  rejectPurchaseRequest: (id: number, notes: string) =>
    request<{ message: string }>(`/api/purchase-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),

  // Pengaturan: alur approval
  getApprovalFlows: () => request<DepartmentApprovalFlow[]>('/api/approval-flows'),
  getApproverOptions: () => request<ApproverOption[]>('/api/approval-flows/user-options'),
  saveApprovalFlow: (departmentId: number, steps: { name: string; approverId: number }[]) =>
    request<{ message: string }>(`/api/approval-flows/${departmentId}`, { method: 'PUT', body: JSON.stringify({ steps }) }),

  // Manajemen user
  getUserDepartmentOptions: () => request<DepartmentRef[]>('/api/users/department-options'),
  getUsers: () => request<ManagedUser[]>('/api/users'),
  createUser: (data: UserInput) =>
    request<ManagedUser>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: UserInput) =>
    request<ManagedUser>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Role & permission
  getRoles: () => request<Role[]>('/api/roles'),
  getPermissions: () => request<PermissionOption[]>('/api/roles/permissions'),
  createRole: (data: RoleInput) =>
    request<Role>('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: number, data: RoleInput) =>
    request<Role>(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: number) => request<{ message: string }>(`/api/roles/${id}`, { method: 'DELETE' }),
}
