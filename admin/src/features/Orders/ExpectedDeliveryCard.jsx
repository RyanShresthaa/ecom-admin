import { useEffect, useMemo, useState } from 'react'
import { CalendarBlank, SpinnerGap } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSetExpectedDelivery } from '@/hooks/useOrders'
import { formatDateTime } from '@/lib/utils'

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const SCHEDULABLE = new Set([
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
])

/** Admin control: set expected delivery date/time after order is Confirmed. */
export function ExpectedDeliveryCard({ order, canWrite }) {
  const save = useSetExpectedDelivery()
  const [value, setValue] = useState(() => toLocalInputValue(order?.expectedDeliveryAt))

  useEffect(() => {
    setValue(toLocalInputValue(order?.expectedDeliveryAt))
  }, [order?.expectedDeliveryAt, order?.id])

  const canSchedule = useMemo(
    () => SCHEDULABLE.has(String(order?.deliveryStatus || '')),
    [order?.deliveryStatus]
  )

  function handleSave() {
    if (!value) return
    save.mutate({ id: order.id, expectedDeliveryAt: new Date(value).toISOString() })
  }

  function handleClear() {
    save.mutate({ id: order.id, expectedDeliveryAt: null })
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarBlank size={12} />
        Expected delivery
      </p>
      {!canSchedule ? (
        <p className="text-sm text-muted-foreground">
          Mark the order as <span className="font-medium text-foreground">Confirmed</span> first,
          then set a delivery date/time.
          {order?.expectedDeliveryAt ? (
            <span className="mt-1 block text-foreground">
              Current: {formatDateTime(order.expectedDeliveryAt)}
            </span>
          ) : null}
        </p>
      ) : canWrite ? (
        <div className="flex flex-col gap-2">
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-9"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!value || save.isPending}
              className="gap-1.5"
            >
              {save.isPending ? <SpinnerGap size={14} className="animate-spin" /> : null}
              Save
            </Button>
            {order?.expectedDeliveryAt ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClear}
                disabled={save.isPending}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium">
          {order?.expectedDeliveryAt
            ? formatDateTime(order.expectedDeliveryAt)
            : 'Not scheduled'}
        </p>
      )}
    </div>
  )
}
