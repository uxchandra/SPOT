import { useState } from "react"
import type { FormEvent } from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/api"
import { useAuth } from "@/lib/auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      // Server mati / tidak terjangkau -> pesan khusus; selain itu pakai pesan dari backend
      const unreachable = err instanceof ApiError && (err.status === 0 || err.status >= 500)
      setError(unreachable ? "Unable to connect to the server. Please try again later." : (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gap-8 py-10">
        <CardHeader className="px-10 text-center">
          <CardTitle className="text-3xl">Welcome back</CardTitle>
          <CardDescription className="text-base">Sign in with your email and password</CardDescription>
        </CardHeader>
        <CardContent className="px-10">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email" className="text-base">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 md:text-base"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="text-base">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 md:text-base"
                  required
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Field>
                <Button type="submit" size="lg" className="h-11 text-base" disabled={submitting}>
                  {submitting ? "Signing in..." : "Sign in"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Don't have an account or forgot your password? Contact your administrator.
      </FieldDescription>
    </div>
  )
}
