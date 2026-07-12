import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Lock, SpinnerGap, WarningCircle } from '@phosphor-icons/react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPasswordMutation } from '@/hooks/useAuthApi'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)

  const resetPassword = useResetPasswordMutation()
  const navigate = useNavigate()

  if (!token) {
    return (
      <AuthLayout title="Invalid reset link">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <WarningCircle size={22} weight="bold" />
          </div>
          <p className="text-sm text-muted-foreground">
            This password reset link is missing or malformed. Request a new one to continue.
          </p>
          <Button asChild className="mt-1">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout title="Password updated">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle size={22} weight="fill" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <Button onClick={() => navigate('/login')} className="mt-1">
            Continue to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  function validate() {
    const next = {}
    if (password.length < 6) next.password = 'Password must be at least 6 characters'
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    resetPassword.mutate(
      { token, password },
      {
        onSuccess: () => setSuccess(true),
        onError: (err) => setErrors({ form: err.message }),
      }
    )
  }

  return (
    <AuthLayout title="Set a new password" description="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errors.form && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errors.form}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-8"
            />
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-8"
            />
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
        </div>

        <Button type="submit" disabled={resetPassword.isPending} className="mt-1 gap-1.5">
          {resetPassword.isPending && <SpinnerGap size={15} className="animate-spin" />}
          Reset password
        </Button>
      </form>
    </AuthLayout>
  )
}
