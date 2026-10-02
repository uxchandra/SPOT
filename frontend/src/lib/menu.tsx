import { DatabaseIcon, FileTextIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AuthUser } from '@/types'

export interface MenuSubItem {
  title: string
  url: string
  // Kalau diisi, menu hanya tampil untuk user yang punya salah satu permission ini
  permission?: string | string[]
  // Tampilkan juga untuk user yang ditunjuk sebagai approver (walau tanpa permission di atas)
  forApprover?: boolean
  // Tampilkan angka jumlah PB yang menunggu approval user
  showPendingBadge?: boolean
}

export interface MenuItem {
  title: string
  url?: string // untuk menu tanpa submenu
  icon: ReactNode
  permission?: string
  items?: MenuSubItem[] // kalau ada, menu menjadi grup yang bisa dibuka-tutup
}

// Daftar menu sidebar. Tambahkan menu baru di sini.
export const MENU: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: <LayoutDashboardIcon />,
  },
  {
    title: 'Data Master',
    icon: <DatabaseIcon />,
    items: [
      { title: 'Department', url: '/departments', permission: 'department.view' },
      { title: 'Kategori Item', url: '/item-categories', permission: 'item_category.view' },
      { title: 'Supplier', url: '/suppliers', permission: 'supplier.view' },
      { title: 'Item List', url: '/items', permission: 'item.view' },
    ],
  },
  {
    title: 'Transaction',
    icon: <FileTextIcon />,
    items: [
      {
        title: 'Permintaan Barang',
        url: '/purchase-requests',
        permission: ['purchase_request.view', 'purchase_request.view_all', 'purchase_request.create'],
        forApprover: true,
        showPendingBadge: true,
      },
    ],
  },
  {
    title: 'User Management',
    icon: <UsersIcon />,
    items: [
      { title: 'User', url: '/users', permission: 'user.manage' },
      { title: 'Role', url: '/roles', permission: 'role.manage' },
    ],
  },
  {
    title: 'Setting',
    icon: <SettingsIcon />,
    items: [{ title: 'Alur Approval', url: '/approval-flows', permission: 'approval_flow.manage' }],
  },
]

// Apakah user boleh melihat submenu ini
export function canSeeMenu(sub: MenuSubItem, user: AuthUser | null, can: (permission: string) => boolean) {
  if (!sub.permission) return true
  const permissions = Array.isArray(sub.permission) ? sub.permission : [sub.permission]
  return permissions.some(can) || (sub.forApprover === true && user?.isApprover === true)
}

// Saring menu sesuai permission user. Grup yang semua submenunya tersaring ikut disembunyikan.
export function filterMenu(menu: MenuItem[], user: AuthUser | null, can: (permission: string) => boolean): MenuItem[] {
  return menu
    .filter((item) => !item.permission || can(item.permission))
    .map((item) => ({
      ...item,
      items: item.items?.filter((sub) => canSeeMenu(sub, user, can)),
    }))
    .filter((item) => !item.items || item.items.length > 0)
}

// Cari judul halaman untuk breadcrumb berdasarkan URL.
// Halaman turunan (contoh /purchase-requests/12) memakai menu induknya + judul tambahan.
const SUB_PAGE_TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/purchase-requests\/new$/, title: 'Buat PB' },
  { pattern: /^\/purchase-requests\/\d+\/edit$/, title: 'Edit PB' },
  { pattern: /^\/purchase-requests\/\d+$/, title: 'Detail PB' },
]

export function findBreadcrumb(pathname: string): { parent?: string; parentUrl?: string; title: string } | null {
  for (const item of MENU) {
    const sub = item.items?.find((s) => s.url === pathname)
    if (sub) return { parent: item.title, title: sub.title }
    if (item.url === pathname) return { title: item.title }

    const base = item.items?.find((s) => pathname.startsWith(`${s.url}/`))
    const subPage = SUB_PAGE_TITLES.find((p) => p.pattern.test(pathname))
    if (base && subPage) return { parent: base.title, parentUrl: base.url, title: subPage.title }
  }
  return null
}
