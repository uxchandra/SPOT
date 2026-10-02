import { useState } from "react"
import { Link, useLocation } from "react-router"
import { ChevronRightIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { MenuItem, MenuSubItem } from "@/lib/menu"
import { usePendingApprovals } from "@/lib/pending-approvals"

// Badge angka kecil, contoh jumlah PB yang menunggu approval
function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-white tabular-nums ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

export function NavMain({ items }: { items: MenuItem[] }) {
  const { pathname } = useLocation()
  const { count: pendingCount } = usePendingApprovals()
  const badgeFor = (sub: MenuSubItem) => (sub.showPendingBadge ? pendingCount : 0)
  // Submenu aktif juga saat membuka halaman turunannya, contoh /purchase-requests/12
  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`)

  // Hanya satu grup menu yang terbuka (akordeon). Awalnya: grup yang berisi halaman aktif.
  const activeGroup = items.find((item) => item.items?.some((sub) => isActive(sub.url)))?.title ?? null
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup)
  // Kalau pindah ke halaman milik grup lain (contoh lewat link di dashboard), buka grup tersebut
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (activeGroup) setOpenGroup(activeGroup)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          // Menu tanpa submenu: langsung jadi link
          !item.items ? (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={pathname === item.url}>
                <Link to={item.url ?? "/"}>
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            // Menu dengan submenu: bisa dibuka-tutup; membuka satu grup menutup grup lainnya
            <Collapsible
              key={item.title}
              asChild
              open={openGroup === item.title}
              onOpenChange={(open) => setOpenGroup(open ? item.title : null)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon}
                    <span>{item.title}</span>
                    {/* Saat grup tertutup, tampilkan total badge di judul grup */}
                    <CountBadge
                      count={item.items.reduce((sum, sub) => sum + badgeFor(sub), 0)}
                      className="group-data-[state=open]/collapsible:hidden"
                    />
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                            <CountBadge count={badgeFor(subItem)} />
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
