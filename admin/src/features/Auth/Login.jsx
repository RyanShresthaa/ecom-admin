import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Envelope, Lock, SignIn, SpinnerGap } from '@phosphor-icons/react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { useLoginMutation } from '@/hooks/useAuthApi'
import { ROLE_LABELS } from '@/lib/permissions'

// Login page — pre-filled staff credentials for local/demo sign-in.
const DEMO_ACCOUNTS = [
  { email: 'staff.verify@matinacrafts.com', password: 'StaffVerify123!', role: 'admin' },
]

// Login page — email/password form that authenticates staff and redirects after sign-in.
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  const { login } = useAuth()
  const loginMutation = useLoginMutation()
  const navigate = useNavigate()
  const location = useLocation()

  // Preserve the route the user tried to visit before being sent to login.
  const redirectTo = location.state?.from?.pathname ?? '/'

  // Login page — client-side validation for required email and password fields.
  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Email is required'
    if (!password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // Login page — submit credentials to the API and store the session on success.
  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          login(data)
          navigate(redirectTo, { replace: true })
        },
        onError: (err) => setErrors({ form: err.message }),
      }
    )
  }

  // Login page — populate the form from a demo staff account shortcut.
  function fillDemoAccount(account) {
    setEmail(account.email)
    setPassword(account.password)
    setErrors({})
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to manage your store."
      footer={
        <>
          Forgot password?{' '}
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Reset it
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.form && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errors.form}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Envelope size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="pl-8"
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-8"
            />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <Button type="submit" disabled={loginMutation.isPending} className="mt-1 gap-1.5">
          {loginMutation.isPending ? <SpinnerGap size={15} className="animate-spin" /> : <SignIn size={15} weight="bold" />}
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Staff account</span>
        <Separator className="flex-1" />
      </div>

      <div className="flex flex-col gap-1.5">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => fillDemoAccount(account)}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-secondary"
          >
            <span className="font-mono text-muted-foreground">{account.email}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
              {ROLE_LABELS[account.role]}
            </span>
          </button>
        ))}
      </div>
    </AuthLayout>
  )
}
