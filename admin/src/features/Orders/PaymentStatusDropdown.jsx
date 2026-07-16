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

// Payment status options shown in the dropdown menu.
const OPTIONS = [
  { value: 'Paid', icon: CreditCard },
  { value: 'Unpaid', icon: Clock },
  { value: 'Refunded', icon: ArrowCounterClockwise },
]

// Normalize API payment status strings to match dropdown option values.
function normalizePaymentStatus(status) {
  const raw = String(status || '').trim()
  const match = OPTIONS.find((opt) => opt.value.toLowerCase() === raw.toLowerCase())
  return match?.value || raw
}

// Orders list/detail — inline dropdown to update payment status (read-only badge without write access).
export function PaymentStatusDropdown({ order }) {
  const updateStatus = useUpdateOrderStatus()
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.ORDERS_WRITE)
  const current = normalizePaymentStatus(order.paymentStatus)

  if (!canWrite) {
    return <PaymentStatusBadge status={current} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
        disabled={updateStatus.isPending}
      >
        <PaymentStatusBadge status={current} />
        <CaretDown size={11} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>Update payment status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            disabled={opt.value === current}
            onClick={() =>
              updateStatus.mutate({ id: order.id, payload: { paymentStatus: opt.value } })
            }
          >
            <opt.icon size={14} />
            {opt.value}
            {opt.value === current && (
              <CheckCircle size={14} weight="fill" className="ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
