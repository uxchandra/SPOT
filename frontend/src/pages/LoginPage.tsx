import { Navigate, useLocation } from 'react-router'
import { LoginForm } from '@/components/login-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { APP_FULL_NAME, APP_NAME, COMPANY_LOGO, COMPANY_NAME } from '@/lib/app'
import { useAuth } from '@/lib/auth'

// Corak latar belakang halaman login. Ganti nilainya untuk mencoba corak lain:
// - 'blueprint' : grid kecil di dalam grid besar, seperti kertas milimeter teknik
// - 'dots'      : titik-titik halus + semburat merah STEP di pojok
const BACKGROUND_PATTERN: 'blueprint' | 'dots' = 'blueprint'

// Warna garis/titik diambil dari warna teks (--foreground), jadi otomatis menyesuaikan mode terang/gelap
const FADE_TO_EDGES = 'mask-[radial-gradient(ellipse_at_center,black_35%,transparent_85%)]'

function BlueprintBackground() {
  return (
    <>
      {/* Grid kecil (tiap 16px), sangat tipis */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px)] bg-size-[16px_16px] ${FADE_TO_EDGES}`}
      />
      {/* Grid besar (tiap 80px), sedikit lebih tegas */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_13%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_13%,transparent)_1px,transparent_1px)] bg-size-[80px_80px] ${FADE_TO_EDGES}`}
      />
    </>
  )
}

function DotsBackground() {
  return (
    <>
      {/* Semburat merah STEP yang samar di pojok kiri atas & kanan bawah */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-120 rounded-full bg-red-500/20 blur-3xl dark:bg-red-600/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-40 size-120 rounded-full bg-red-500/15 blur-3xl dark:bg-red-600/10"
      />
      {/* Titik-titik halus */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_22%,transparent)_1px,transparent_1px)] bg-size-[22px_22px] ${FADE_TO_EDGES}`}
      />
    </>
  )
}

// Tata letak halaman dari blok shadcn login-03, ditambah latar belakang bercorak
export default function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Sudah login: arahkan ke halaman yang tadi dituju, atau ke dashboard
  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-muted">
      {BACKGROUND_PATTERN === 'blueprint' ? <BlueprintBackground /> : <DotsBackground />}

      {/* Header: identitas aplikasi di kiri, tombol tema di kanan */}
      <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <img src={COMPANY_LOGO} alt={COMPANY_NAME} className="h-9 w-auto" />
          <div className="grid border-l pl-3 leading-tight">
            <span className="font-semibold">{APP_NAME}</span>
            <span className="text-xs text-muted-foreground sm:text-sm">{APP_FULL_NAME}</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Form login di tengah. pb setinggi header supaya form tetap terlihat di tengah layar */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-6 pb-20 md:p-10 md:pb-24">
        <div className="w-full max-w-lg">
          <LoginForm />
        </div>
      </main>
    </div>
  )
}
