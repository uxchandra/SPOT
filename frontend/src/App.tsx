import { Link, Navigate, Route, Routes } from 'react-router'
import { RequireAuth, RequirePermission } from '@/components/route-guards'
import { Button } from '@/components/ui/button'
import AdminLayout from '@/layouts/AdminLayout'
import ApprovalFlowsPage from '@/pages/ApprovalFlowsPage'
import DashboardPage from '@/pages/DashboardPage'
import LoginPage from '@/pages/LoginPage'
import DepartmentsPage from '@/pages/DepartmentsPage'
import ItemCategoriesPage from '@/pages/ItemCategoriesPage'
import ItemsPage from '@/pages/ItemsPage'
import PurchaseRequestDetailPage from '@/pages/PurchaseRequestDetailPage'
import PurchaseRequestFormPage from '@/pages/PurchaseRequestFormPage'
import PurchaseRequestsPage from '@/pages/PurchaseRequestsPage'
import RolesPage from '@/pages/RolesPage'
import SuppliersPage from '@/pages/SuppliersPage'
import UsersPage from '@/pages/UsersPage'

const PR_VIEW_PERMISSIONS = ['purchase_request.view', 'purchase_request.view_all', 'purchase_request.create']

// Daftar halaman (route) aplikasi
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Semua halaman di bawah ini wajib login dan memakai layout admin dengan sidebar */}
      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          {/* Transaksi: Permintaan Barang. Detail PB boleh dibuka siapa saja yang login;
              backend yang menentukan PB mana yang boleh dilihat. */}
          <Route
            path="purchase-requests"
            element={
              <RequirePermission permission={PR_VIEW_PERMISSIONS} allowApprover>
                <PurchaseRequestsPage />
              </RequirePermission>
            }
          />
          <Route
            path="purchase-requests/new"
            element={
              <RequirePermission permission="purchase_request.create">
                <PurchaseRequestFormPage />
              </RequirePermission>
            }
          />
          <Route path="purchase-requests/:id" element={<PurchaseRequestDetailPage />} />
          <Route
            path="purchase-requests/:id/edit"
            element={
              <RequirePermission permission="purchase_request.create">
                <PurchaseRequestFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="approval-flows"
            element={
              <RequirePermission permission="approval_flow.manage">
                <ApprovalFlowsPage />
              </RequirePermission>
            }
          />
          <Route
            path="departments"
            element={
              <RequirePermission permission="department.view">
                <DepartmentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="item-categories"
            element={
              <RequirePermission permission="item_category.view">
                <ItemCategoriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="suppliers"
            element={
              <RequirePermission permission="supplier.view">
                <SuppliersPage />
              </RequirePermission>
            }
          />
          <Route
            path="items"
            element={
              <RequirePermission permission="item.view">
                <ItemsPage />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission permission="user.manage">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission permission="role.manage">
                <RolesPage />
              </RequirePermission>
            }
          />
          <Route
            path="*"
            element={
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
                <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Kembali ke Dashboard</Link>
                </Button>
              </div>
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
