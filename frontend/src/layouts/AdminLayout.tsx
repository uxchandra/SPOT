import { Fragment } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { NavUser } from '@/components/nav-user'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { findBreadcrumb } from '@/lib/menu'
import { PendingApprovalsProvider } from '@/lib/pending-approvals'

// Tata letak admin panel dari blok shadcn sidebar-07.
// Halaman aktif dirender di <Outlet />.
export default function AdminLayout() {
  const { pathname } = useLocation()
  const crumb = findBreadcrumb(pathname)

  return (
    <PendingApprovalsProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
              {crumb && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {crumb.parent && (
                      <Fragment>
                        <BreadcrumbItem className="hidden md:block">
                          {crumb.parentUrl ? (
                            <BreadcrumbLink asChild>
                              <Link to={crumb.parentUrl}>{crumb.parent}</Link>
                            </BreadcrumbLink>
                          ) : (
                            crumb.parent
                          )}
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                      </Fragment>
                    )}
                    <BreadcrumbItem>
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
            {/* Navbar kanan: pilihan tema & menu profil */}
            <div className="ml-auto flex items-center gap-2 px-4">
              <ThemeToggle />
              <NavUser />
            </div>
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PendingApprovalsProvider>
  )
}
