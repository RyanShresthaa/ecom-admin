import { useEffect, useState } from 'react'
import { FloppyDisk, Plus, Trash, Percent, SpinnerGap } from '@phosphor-icons/react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/PageHeader'
import { useSettingsQuery, useSaveSettings } from '@/hooks/useSettings'

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
]

const REGIONS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'European Union',
  'India',
  'Singapore',
]

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

export default function Settings() {
  const { data, isLoading } = useSettingsQuery()
  const saveSettings = useSaveSettings()

  const [form, setForm] = useState(null)

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  if (isLoading || !form) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Settings" description="Configure store-wide preferences." />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateTaxRule(id, field, value) {
    setForm((prev) => ({
      ...prev,
      taxRules: prev.taxRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)),
    }))
  }

  function addTaxRule() {
    setForm((prev) => ({
      ...prev,
      taxRules: [
        ...prev.taxRules,
        { id: nextTaxId++, label: 'New tax rule', rate: 0, region: REGIONS[0] },
      ],
    }))
  }

  function removeTaxRule(id) {
    setForm((prev) => ({ ...prev, taxRules: prev.taxRules.filter((r) => r.id !== id) }))
  }

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
      </Tabs>
    </div>
  )
}
