import { useEffect, useState } from 'react'
import { FloppyDisk, SpinnerGap } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { useProfileQuery, useUpdateProfile } from '@/hooks/useProfile'
import { formatDate, getInitials } from '@/lib/utils'

export default function Profile() {
  const { data, isLoading } = useProfileQuery()
  const updateProfile = useUpdateProfile()
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  if (isLoading || !form) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Profile"
          description="Your admin account — name, email, and contact details."
        />
        <Skeleton className="h-72 w-full max-w-2xl" />
      </div>
    )
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    updateProfile.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      bio: form.bio,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profile"
        description="Your admin account — name, email, and contact details."
        actions={
          <Button onClick={handleSave} disabled={updateProfile.isPending} className="gap-1.5">
            {updateProfile.isPending ? (
              <SpinnerGap size={14} className="animate-spin" />
            ) : (
              <FloppyDisk size={14} />
            )}
            Save profile
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(form.name)}
            </div>
            <div>
              <CardTitle>{form.name}</CardTitle>
              <CardDescription>
                {form.role} · Member since {formatDate(form.createdAt)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={form.role}
                onChange={(e) => update('role', e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
