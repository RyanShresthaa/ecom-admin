import { useEffect, useState } from 'react'
import { FloppyDisk, Plus, Trash, Percent, SpinnerGap, GlobeHemisphereWest } from '@phosphor-icons/react'

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

const REGION_MODES = [
  {
    value: 'us',
    label: 'United States',
    hint: 'Auto USD · America/New_York · US addresses · prices converted from NPR',
  },
  {
    value: 'nepal',
    label: 'Nepal',
    hint: 'Auto NPR · Asia/Kathmandu · Nepal addresses · 13% VAT',
  },
]

const REGIONS = {
  us: ['United States', 'Canada'],
  nepal: ['Nepal'],
}

const TIMEZONES = {
  us: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
  ],
  nepal: ['Asia/Kathmandu'],
}

const PRESETS = {
  us: {
    regionMode: 'us',
    currency: 'USD',
    region: 'United States',
    timezone: 'America/New_York',
    taxRules: [
      { id: 1, label: 'Sales tax (none / remitted separately)', rate: 0, region: 'United States' },
    ],
  },
  nepal: {
    regionMode: 'nepal',
    currency: 'NPR',
    region: 'Nepal',
    timezone: 'Asia/Kathmandu',
    taxRules: [{ id: 1, label: 'VAT 13%', rate: 13, region: 'Nepal' }],
  },
}

let nextTaxId = 1000

export default function Settings() {
  const { data, isLoading } = useSettingsQuery()
  const saveSettings = useSaveSettings()

  const [form, setForm] = useState(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  if (isLoading || !form) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Settings"
          description="Configure store region, currency, timezone, tax, and company details."
        />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const mode = form.regionMode === 'nepal' ? 'nepal' : 'us'
  const regions = REGIONS[mode]
  const timezones = TIMEZONES[mode]
  const autoCurrency = mode === 'nepal' ? 'NPR' : 'USD'

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function applyRegionMode(nextMode) {
    const preset = PRESETS[nextMode] || PRESETS.us
    setForm((prev) => ({
      ...prev,
      ...preset,
      currency: nextMode === 'nepal' ? 'NPR' : 'USD',
      usdNprRate: prev.usdNprRate || 133,
      priceBaseCurrency: 'NPR',
      storeName: prev.storeName,
      lowStockThreshold: prev.lowStockThreshold,
      taxRules: preset.taxRules.map((r) => ({ ...r, id: nextTaxId++ })),
    }))
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
        {
          id: nextTaxId++,
          label: 'New tax rule',
          rate: mode === 'nepal' ? 13 : 0,
          region: regions[0],
        },
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
        description="Configure store region, currency, timezone, tax, and company details."
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
              <CardDescription>
                Switch between United States and Nepal. This updates currency, timezone, tax defaults,
                and shipping address rules across the store.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label>Store region</Label>
                <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                  {REGION_MODES.map((opt) => {
                    const active = mode === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => applyRegionMode(opt.value)}
                        className={`rounded-lg border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:bg-accent/40'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <GlobeHemisphereWest
                            size={16}
                            weight={active ? 'fill' : 'regular'}
                            className={active ? 'text-primary' : 'text-muted-foreground'}
                          />
                          <span className="text-sm font-semibold">{opt.label}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{opt.hint}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

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
                  <Label>Display currency (auto)</Label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                    {autoCurrency === 'USD' ? 'US Dollar (USD)' : 'Nepalese Rupee (NPR)'}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Switches automatically with the region. Catalog prices convert NPR ↔ USD.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="usdNprRate">Exchange rate (1 USD = ? NPR)</Label>
                  <Input
                    id="usdNprRate"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.usdNprRate ?? 133}
                    onChange={(e) => update('usdNprRate', Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used to convert product prices between Nepal (NPR) and US (USD).
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Catalog prices</Label>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                    Stored in NPR · shown as {autoCurrency}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Product prices are saved in Nepalese Rupees and converted with the rate above.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="region">Market label</Label>
                  <Select value={form.region} onValueChange={(v) => update('region', v)}>
                    <SelectTrigger id="region">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
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
                      {timezones.map((tz) => (
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
                <CardDescription>
                  {mode === 'nepal'
                    ? 'Nepal VAT is typically 13%. Rates apply at checkout.'
                    : 'US sales tax can be left at 0% if you remittance separately, or set your rate here.'}
                </CardDescription>
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
                    <Select
                      value={rule.region}
                      onValueChange={(v) => updateTaxRule(rule.id, 'region', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (
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
