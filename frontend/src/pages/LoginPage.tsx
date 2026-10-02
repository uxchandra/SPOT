import { ClipboardList } from 'lucide-react'
import { Navigate, useLocation } from 'react-router'
import { LoginForm } from '@/components/login-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { APP_FULL_NAME, APP_NAME } from '@/lib/app'
import { useAuth } from '@/lib/auth'

// Tata letak halaman dari blok shadcn login-03
export default function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Sudah login: arahkan ke halaman yang tadi dituju, atau ke dashboard
  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardList className="size-4" />
          </div>
          <div className="grid leading-tight">
            <span className="font-semibold">{APP_NAME}</span>
            <span className="text-xs text-muted-foreground">{APP_FULL_NAME}</span>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
