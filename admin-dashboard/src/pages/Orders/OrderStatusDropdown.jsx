import {
  CaretDown,
  CheckCircle,
  Clock,
  PackageIcon,
  Truck,
  ArrowUUpLeft,
  XCircle,
} from '@phosphor-icons/react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeliveryStatusBadge } from '@/components/common/StatusBadge'
import { useUpdateOrderStatus } from '@/hooks/useOrders'

const OPTIONS = [
  { value: 'Pending', icon: Clock },
  { value: 'Shipped', icon: Truck },
  { value: 'Delivered', icon: PackageIcon },
  { value: 'Returned', icon: ArrowUUpLeft },
  { value: 'Cancelled', icon: XCircle },
]

export function OrderStatusDropdown({ order }) {
  const updateStatus = useUpdateOrderStatus()
  const locked = order.deliveryStatus === 'Cancelled'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
        disabled={updateStatus.isPending || locked}
      >
        <DeliveryStatusBadge status={order.deliveryStatus} />
        {!locked && <CaretDown size={11} className="text-muted-foreground" />}
      </DropdownMenuTrigger>
      {!locked && (
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Update delivery status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              disabled={opt.value === order.deliveryStatus}
              onClick={() =>
                updateStatus.mutate({ id: order.id, payload: { deliveryStatus: opt.value } })
              }
            >
              <opt.icon size={14} />
              {opt.value}
              {opt.value === 'Cancelled' && (
                <span className="ml-auto text-[10px] text-muted-foreground">refund if paid</span>
              )}
              {opt.value === order.deliveryStatus && (
                <CheckCircle size={14} weight="fill" className="ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}
