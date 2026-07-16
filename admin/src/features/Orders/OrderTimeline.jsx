import {
  Clock,
  Truck,
  CreditCard,
  NotePencil,
  PlusCircle,
} from '@phosphor-icons/react'

import { formatDateTime } from '@/lib/utils'

// Icon mapping for each timeline event type.
const TYPE_ICONS = {
  created: PlusCircle,
  delivery: Truck,
  payment: CreditCard,
  note: NotePencil,
}

// Background color classes per timeline event type.
const TYPE_COLORS = {
  created: 'bg-primary/10 text-primary',
  delivery: 'bg-blue-500/10 text-blue-600',
  payment: 'bg-success/10 text-success',
  note: 'bg-warning/15 text-warning-foreground',
}

// Order detail page — chronological feed of status changes and notes.
export function OrderTimeline({ history = [] }) {
  if (!history.length) {
    return <p className="text-sm text-muted-foreground">No timeline events yet.</p>
  }

  // Show newest events first.
  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return (
    <div className="relative flex flex-col gap-0">
      {sorted.map((event, index) => {
        const Icon = TYPE_ICONS[event.type] || Clock
        const isLast = index === sorted.length - 1

        return (
          <div key={event.id} className="relative flex gap-3 pb-6">
            {!isLast && (
              <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />
            )}
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_COLORS[event.type] || 'bg-secondary'}`}>
              <Icon size={14} weight="fill" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <p className="text-sm font-medium text-foreground">{event.message}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.timestamp)}
                {event.author && ` · ${event.author}`}
              </p>
              {(event.deliveryStatus || event.paymentStatus) && (
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {event.deliveryStatus && (
                    <span className="inline-flex items-center gap-1">
                      <Truck size={11} /> {event.deliveryStatus}
                    </span>
                  )}
                  {event.paymentStatus && (
                    <span className="inline-flex items-center gap-1">
                      <CreditCard size={11} /> {event.paymentStatus}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
