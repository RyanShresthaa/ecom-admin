import { Link } from 'react-router-dom'
import { EnvelopeSimple, IdentificationCard, ShieldCheck, CalendarBlank } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { PageLoader } from '@/components/common/PageLoader'
import { useAccountQuery } from '@/hooks/useAccount'
import { formatDate, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/permissions'

// Profile page — read-only view of the signed-in admin's account details.
export default function Profile() {
  const { data: account, isLoading } = useAccountQuery()

  // Profile page — full-page loader while account data is fetched.
  if (isLoading) return <PageLoader />

  // Profile page — fallback when account data cannot be loaded.
  if (!account) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Profile not found.</p>
        <Button variant="outline" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profile"
        description="Your admin account details and role in the workspace."
        actions={
          <Button variant="outline" asChild>
            <Link to="/account">Account settings</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Admin profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {getInitials(account.name)}
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <ProfileField icon={IdentificationCard} label="Full name" value={account.name} />
            <ProfileField icon={EnvelopeSimple} label="Email" value={account.email} />
            <ProfileField icon={ShieldCheck} label="Role" value={ROLE_LABELS[account.role] ?? account.role} />
            <ProfileField icon={CalendarBlank} label="Member since" value={formatDate(account.joinedAt)} />
            {account.title && (
              <ProfileField icon={IdentificationCard} label="Title" value={account.title} className="sm:col-span-2" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Profile page — labeled field row with icon for a single account attribute.
function ProfileField({ icon: Icon, label, value, className }) {
  return (
    <div className={className}>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={14} />
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
