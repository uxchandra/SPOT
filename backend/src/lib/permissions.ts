// Daftar semua permission di aplikasi. Tambahkan di sini kalau ada fitur baru,
// lalu jalankan `npm run db:seed` supaya tersimpan di tabel permissions
// dan muncul sebagai pilihan di halaman Role.
export const PERMISSIONS = {
  "department.view": "Melihat daftar department",
  "department.manage": "Menambah, mengubah & menghapus department",
  "item_category.view": "Melihat daftar kategori item",
  "item_category.manage": "Menambah, mengubah & menghapus kategori item",
  "supplier.view": "Melihat daftar supplier",
  "supplier.manage": "Menambah, mengubah & menghapus supplier",
  "item.view": "Melihat daftar item",
  "item.manage": "Menambah, mengubah & menghapus item",
  "purchase_request.view": "Melihat permintaan barang department sendiri",
  "purchase_request.view_all": "Melihat permintaan barang semua department",
  "purchase_request.create": "Membuat, merevisi & mengajukan permintaan barang",
  "approval_flow.manage": "Mengatur alur approval",
  "user.manage": "Mengelola user",
  "role.manage": "Mengelola role & permission",
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

// Nama grup untuk menampilkan permission per modul. Kuncinya = awalan nama permission.
export const PERMISSION_GROUPS: Record<string, string> = {
  department: "Data Master",
  item_category: "Data Master",
  supplier: "Data Master",
  item: "Data Master",
  purchase_request: "Permintaan Barang",
  approval_flow: "Pengaturan",
  user: "Manajemen User",
  role: "Manajemen User",
};

export function permissionGroup(name: string): string {
  return PERMISSION_GROUPS[name.split(".")[0]] ?? "Lainnya";
}

// Role "admin" adalah role sistem: selalu punya semua permission dan tidak bisa diubah/dihapus,
// supaya tidak ada kejadian semua orang terkunci dari menu Manajemen User.
export const ADMIN_ROLE = "admin";

// Role bawaan yang dibuat seeder saat pertama kali. Setelah itu, permission-nya diatur lewat halaman Role.
export const DEFAULT_ROLES: Record<string, { description: string; permissions: PermissionName[] }> = {
  [ADMIN_ROLE]: {
    description: "Akses penuh",
    permissions: Object.keys(PERMISSIONS) as PermissionName[],
  },
  staff: {
    description: "Staf umum",
    permissions: ["department.view"],
  },
  approver: {
    description: "Penyetuju",
    permissions: ["department.view"],
  },
};
