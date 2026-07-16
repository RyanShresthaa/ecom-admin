import { MapPin, EnvelopeSimple, Receipt } from '@phosphor-icons/react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { PaymentStatusDropdown } from '@/features/Orders/PaymentStatusDropdown'
import { OrderStatusDropdown } from '@/features/Orders/OrderStatusDropdown'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { paymentMethodLabel } from '@/lib/paymentMethod'

// Orders list/detail — slide-over panel showing order summary and inline status controls.
export function OrderDetailsDrawer({ order, open, onOpenChange }) {
  if (!order) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono">{order.id}</SheetTitle>
          <SheetDescription>Placed on {formatDate(order.date)}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(order.customerName)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EnvelopeSimple size={12} /> {order.customerEmail}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Payment method</p>
              <p className="text-sm font-medium">{paymentMethodLabel(order.paymentMethod)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Payment status</p>
              <PaymentStatusDropdown order={order} />
            </div>
            <div className="col-span-2 rounded-lg border border-border p-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Delivery status</p>
              <OrderStatusDropdown order={order} />
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin size={13} /> Shipping address
            </p>
            <p className="text-sm text-foreground">{order.shippingAddress}</p>
          </div>

          <Separator />

          <div>
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Receipt size={13} /> Items ({order.items.length})
            </p>
            <div className="flex flex-col gap-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Qty {item.qty} × {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Order total</span>
            <span className="font-mono text-base font-semibold tabular-nums text-foreground">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
