import { CaretDown, CheckCircle, Clock } from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PaymentStatusBadge } from '@/components/common/StatusBadge'
import { useUpdateOrderStatus } from '@/hooks/useOrders'

const OPTIONS = [
  { value: 'Paid', icon: CheckCircle },
  { value: 'Unpaid', icon: Clock },
]

export function PaymentStatusDropdown({ order }) {
  const updateStatus = useUpdateOrderStatus()
  const locked =
    order.deliveryStatus === 'Cancelled' ||
    order.paymentStatus === 'Refunded' ||
    order.paymentStatus === 'Cancelled'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
        disabled={updateStatus.isPending || locked}
      >
        <PaymentStatusBadge status={order.paymentStatus} />
        {!locked && <CaretDown size={11} className="text-muted-foreground" />}
      </DropdownMenuTrigger>
      {!locked && (
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel>Update payment</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              disabled={opt.value === order.paymentStatus}
              onClick={() =>
                updateStatus.mutate({
                  id: order.id,
                  payload: { paymentStatus: opt.value },
                })
              }
            >
              <opt.icon size={14} />
              {opt.value}
              {opt.value === order.paymentStatus && (
                <CheckCircle size={14} weight="fill" className="ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}
