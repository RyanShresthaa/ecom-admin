import { useEffect, useState } from 'react'
import {
  FloppyDisk,
  Plus,
  Trash,
  Percent,
  SpinnerGap,
  CheckCircle,
  WarningCircle,
  ArrowSquareOut,
  CreditCard,
} from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { useSettingsQuery, useSaveSettings, usePaymentStatusQuery } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

// Settings page — supported default currencies for store pricing and reporting.
const CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
]

// Settings page — regions available for tax rules and regional preferences.
const REGIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'European Union',
  'India',
  'Singapore',
]

// Settings page — timezone options for store-wide date and time display.
const TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
]

let nextTaxId = 1000

const STATUS_META = {
  live: { label: 'Live — connected', variant: 'success' },
  test: { label: 'Test mode — connected', variant: 'warning' },
  mock: { label: 'Mock mode (dev only)', variant: 'secondary' },
  disabled: { label: 'Not configured', variant: 'destructive' },
}

function StripePaymentsPanel() {
  const { data, isLoading, isError, refetch, isFetching } = usePaymentStatusQuery()

  if (isLoading) {
    return <Skeleton className="h-72 w-full" />
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load payment status.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const meta = STATUS_META[data.status] || STATUS_META.disabled
  const setupSteps = [
    {
      done: data.envVars?.find((v) => v.name === 'STRIPE_SECRET_KEY')?.configured,
      title: 'Add STRIPE_SECRET_KEY to backend/.env',
      detail: 'Get your secret key from the Stripe Dashboard → Developers → API keys.',
    },
    {
      done: data.webhookConfigured,
      title: 'Add STRIPE_WEBHOOK_SECRET (recommended)',
      detail: 'Create a webhook endpoint in Stripe for payment confirmations.',
    },
    {
      done: Boolean(data.currency),
      title: 'Set checkout currency',
      detail: `Checkout uses ${String(data.currency || 'usd').toUpperCase()} (from STRIPE_CURRENCY or store currency).`,
    },
    {
      done: data.stripeConfigured,
      title: 'Restart the API after updating .env',
      detail: 'The backend loads Stripe keys on startup.',
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              <CardTitle>Stripe payments</CardTitle>
            </div>
            <CardDescription>
              Customers pay through Stripe Checkout. Funds go to your Stripe account — not bank details
              stored here.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusTile label="Provider" value="Stripe Checkout" />
            <StatusTile label="Checkout currency" value={String(data.currency || 'usd').toUpperCase()} />
            <StatusTile
              label="Secret key"
              value={data.secretKeyHint || (data.mockAllowed ? 'Mock (no key)' : 'Not set')}
            />
            <StatusTile label="Webhook" value={data.webhookConfigured ? 'Configured' : 'Not set'} />
          </div>

          {data.status === 'mock' && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              <strong>Development mock mode.</strong> Orders can be placed without real Stripe keys in
              non-production. Set <code className="text-xs">STRIPE_SECRET_KEY</code> before going live.
            </div>
          )}

          {data.status === 'disabled' && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <strong className="text-destructive">Stripe is not configured.</strong> Checkout will fail
              until you add API keys to <code className="text-xs">backend/.env</code>.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup checklist</CardTitle>
          <CardDescription>Configure Stripe on the server — keys are never stored in this admin UI.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {setupSteps.map((step) => (
            <div
              key={step.title}
              className={cn(
                'flex gap-3 rounded-lg border px-4 py-3',
                step.done ? 'border-success/30 bg-success/5' : 'border-border'
              )}
            >
              {step.done ? (
                <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-success" />
              ) : (
                <WarningCircle size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stripe Dashboard</CardTitle>
          <CardDescription>Manage API keys, payouts, and webhooks in Stripe.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <StripeLink href={data.links?.dashboard}>Open Stripe Dashboard</StripeLink>
          <StripeLink href={data.links?.apiKeys}>API keys</StripeLink>
          <StripeLink href={data.links?.webhooks}>Webhooks</StripeLink>
          <StripeLink href={data.links?.docs}>Checkout docs</StripeLink>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment variables</CardTitle>
          <CardDescription>Add these to <code className="text-xs">backend/.env</code> on your server.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs leading-relaxed">
{`STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd`}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Payout bank details are configured in Stripe Dashboard → Settings → Payouts, not in this app.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusTile({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  )
}

function StripeLink({ href, children }) {
  if (!href) return null
  return (
    <Button variant="outline" size="sm" className="gap-1.5" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <ArrowSquareOut size={14} />
      </a>
    </Button>
  )
}

// Settings page — manage store name, currency, region, timezone, and tax rules.
export default function Settings() {
  const { data, isLoading } = useSettingsQuery()
  const saveSettings = useSaveSettings()

  const [form, setForm] = useState(null)

  // Settings page — copy fetched settings into local form state once on load.
  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  // Settings page — skeleton layout while settings are loading from the API.
  if (isLoading || !form) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Settings" description="Configure store-wide preferences." />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  // Settings page — update a top-level store preference field in local form state.
  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Settings page — update one field on an existing tax rule by id.
  function updateTaxRule(id, field, value) {
    setForm((prev) => ({
      ...prev,
      taxRules: prev.taxRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)),
    }))
  }

  // Settings page — append a blank tax rule row to the form.
  function addTaxRule() {
    setForm((prev) => ({
      ...prev,
      taxRules: [
        ...prev.taxRules,
        { id: nextTaxId++, label: 'New tax rule', rate: 0, region: REGIONS[0] },
      ],
    }))
  }

  // Settings page — remove a tax rule from the form by id.
  function removeTaxRule(id) {
    setForm((prev) => ({ ...prev, taxRules: prev.taxRules.filter((r) => r.id !== id) }))
  }

  // Settings page — persist the current form values to the backend.
  function handleSave() {
    saveSettings.mutate(form)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Configure tax rules, currency, and regional preferences for your store."
        actions={
          <Button onClick={handleSave} disabled={saveSettings.isPending} className="gap-1.5">
            {saveSettings.isPending ? (
              <SpinnerGap size={14} className="animate-spin" />
            ) : (
              <FloppyDisk size={14} />
            )}
            Save settings
          </Button>
        }
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tax">Tax rules</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Store & regional settings</CardTitle>
              <CardDescription>These apply across checkout, invoices, and reporting.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="storeName">Store name</Label>
                <Input
                  id="storeName"
                  value={form.storeName}
                  onChange={(e) => update('storeName', e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="currency">Default currency</Label>
                  <Select value={form.currency} onValueChange={(v) => update('currency', v)}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="region">Region</Label>
                  <Select value={form.region} onValueChange={(v) => update('region', v)}>
                    <SelectTrigger id="region">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={form.timezone} onValueChange={(v) => update('timezone', v)}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lowStockThreshold">Default low-stock threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(e) => update('lowStockThreshold', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Tax rules</CardTitle>
                <CardDescription>Define tax rates applied per region at checkout.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addTaxRule} className="gap-1.5">
                <Plus size={14} />
                Add rule
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {form.taxRules.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No tax rules yet. Add one to get started.
                </p>
              )}
              {form.taxRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3.5 sm:flex-row sm:items-end"
                >
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Rule name</Label>
                    <Input
                      value={rule.label}
                      onChange={(e) => updateTaxRule(rule.id, 'label', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Region</Label>
                    <Select value={rule.region} onValueChange={(v) => updateTaxRule(rule.id, 'region', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-full flex-col gap-1.5 sm:w-32">
                    <Label className="text-xs text-muted-foreground">Rate</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={rule.rate}
                        onChange={(e) => updateTaxRule(rule.id, 'rate', Number(e.target.value))}
                        className="pr-7"
                      />
                      <Percent
                        size={13}
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeTaxRule(rule.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <StripePaymentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
