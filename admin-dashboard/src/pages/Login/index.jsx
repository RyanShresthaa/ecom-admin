import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SignIn, SpinnerGap, Lightning, CursorClick } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

/** Dev helper — click to autofill. Change if your admin account differs. */
const DEMO_CREDENTIALS = {
  email: 'ryanshr03@gmail.com',
  password: 'Admin@1234',
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function fillDemoCredentials() {
    setEmail(DEMO_CREDENTIALS.email)
    setPassword(DEMO_CREDENTIALS.password)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await login(email, password)
      toast.success('Signed in successfully')
      const redirectTo = location.state?.from || '/'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(err.message || 'Sign in failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 20% 20%, hsl(243 75% 59% / 0.45), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, hsl(243 75% 45% / 0.25), transparent 50%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Lightning size={18} weight="fill" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Matina Crafts</span>
        </div>
        <div className="relative max-w-md space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Admin workspace
          </h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/70">
            Manage products, orders, inventory, and shop settings for Matina Crafts — all in one place.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Matina Crafts
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Lightning size={16} weight="fill" />
          </div>
          <span className="text-base font-semibold tracking-tight">Matina Crafts</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sign in</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your admin credentials to access the dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={fillDemoCredentials}
            className="group mb-6 w-full rounded-lg border border-dashed border-primary/30 bg-accent/60 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-accent"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                Demo credentials
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-80 group-hover:opacity-100">
                <CursorClick size={12} weight="bold" />
                Click to fill
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-foreground">
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{DEMO_CREDENTIALS.email}</span>
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Password:</span>{' '}
                <span className="font-medium tracking-wide">{DEMO_CREDENTIALS.password}</span>
              </p>
            </div>
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="mt-1 h-10 gap-1.5">
              {isSubmitting ? <SpinnerGap size={16} className="animate-spin" /> : <SignIn size={16} />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
