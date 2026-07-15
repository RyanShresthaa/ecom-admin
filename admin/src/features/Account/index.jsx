'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FloppyDisk, Key, SpinnerGap } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/PageHeader'
import { PageLoader } from '@/components/common/PageLoader'
import { useAccountQuery, useUpdateAccount, useUpdatePassword } from '@/hooks/useAccount'

export default function Account() {
  const { data: account, isLoading } = useAccountQuery()
  const updateAccount = useUpdateAccount()
  const updatePassword = useUpdatePassword()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (account) {
      setName(account.name)
      setEmail(account.email)
    }
  }, [account])

  if (isLoading) return <PageLoader />

  function handleProfileSave(event) {
    event.preventDefault()
    updateAccount.mutate({ name: name.trim(), email: email.trim() })
  }

  function handlePasswordSave(event) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    updatePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
      }
    )
  }

  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Account settings"
        description="Update your sign-in details and password."
        actions={
          <Button variant="outline" asChild>
            <Link href="/profile">View profile</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <CardDescription>Changes apply to your admin account across the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="flex max-w-md flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={updateAccount.isPending} className="w-fit gap-1.5">
              {updateAccount.isPending ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <FloppyDisk size={14} />
              )}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use a strong password with at least 6 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="flex max-w-md flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
              {passwordsMismatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={updatePassword.isPending || passwordsMismatch}
              className="w-fit gap-1.5"
            >
              {updatePassword.isPending ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <Key size={14} />
              )}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
