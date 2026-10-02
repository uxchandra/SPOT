import * as React from "react"
import { Link } from "react-router"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { APP_FULL_NAME, APP_NAME, COMPANY_LOGO, COMPANY_NAME } from "@/lib/app"
import { filterMenu, MENU } from "@/lib/menu"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, can } = useAuth()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={APP_NAME}>
              <Link to="/dashboard">
                {/* Logo STEP; saat sidebar diciutkan jadi ikon, logo mengecil mengikuti kotak ikon */}
                <img
                  src={COMPANY_LOGO}
                  alt={COMPANY_NAME}
                  className="h-8 w-14 shrink-0 object-contain group-data-[collapsible=icon]:w-8"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{APP_NAME}</span>
                  <span className="truncate text-xs">{APP_FULL_NAME}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filterMenu(MENU, user, can)} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
