import { CaretDown, CheckCircle, CreditCard, Clock, ArrowCounterClockwise } from '@phosphor-icons/react'

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
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

const OPTIONS = [
  { value: 'Paid', icon: CreditCard },
  { value: 'Unpaid', icon: Clock },
  { value: 'Refunded', icon: ArrowCounterClockwise },
]

export function PaymentStatusDropdown({ order }) {
  const updateStatus = useUpdateOrderStatus()
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.ORDERS_WRITE)

  if (!canWrite) {
    return <PaymentStatusBadge status={order.paymentStatus} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
        disabled={updateStatus.isPending}
      >
        <PaymentStatusBadge status={order.paymentStatus} />
        <CaretDown size={11} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Update payment status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={opt.value === order.paymentStatus}
            onClick={() =>
              updateStatus.mutate({ id: order.id, payload: { paymentStatus: opt.value } })
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
    </DropdownMenu>
  )
}
