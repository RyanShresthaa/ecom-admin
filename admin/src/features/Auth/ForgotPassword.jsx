import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, CheckCircle, Envelope, PaperPlaneTilt, SpinnerGap } from '@phosphor-icons/react'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPasswordMutation } from '@/hooks/useAuthApi'

// Forgot password page — request a reset link for the given email address.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const forgotPassword = useForgotPasswordMutation()

  // Forgot password page — validate email and trigger the reset-link mutation.
  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setError('')

    forgotPassword.mutate(
      { email },
      { onSuccess: (data) => setResult(data) }
    )
  }

  // Forgot password page — confirmation view after the reset request is accepted.
  if (result) {
    return (
      <AuthLayout
        title="Check your email"
        footer={
          <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle size={22} weight="fill" />
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a
            password reset link to it.
          </p>

          {result.devResetToken && (
            // Forgot password page — dev-only shortcut when no email server is configured.
            <div className="mt-2 w-full rounded-md border border-dashed border-border bg-secondary/50 p-3 text-left">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Demo only — no email server is connected
              </p>
              <Link
                to={`/reset-password?token=${result.devResetToken}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open the reset link →
              </Link>
            </div>
          )}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <Button type="submit" disabled={forgotPassword.isPending} className="gap-1.5">
          {forgotPassword.isPending ? (
            <SpinnerGap size={15} className="animate-spin" />
          ) : (
            <PaperPlaneTilt size={15} weight="bold" />
          )}
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  )
}
