import { CaretDown, CheckCircle, Clock, PackageIcon, Truck, ArrowUUpLeft } from '@phosphor-icons/react'

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
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/lib/permissions'

// Delivery status options shown in the dropdown menu.
const OPTIONS = [
  { value: 'Pending', icon: Clock },
  { value: 'Shipped', icon: Truck },
  { value: 'Delivered', icon: PackageIcon },
  { value: 'Returned', icon: ArrowUUpLeft },
]

// Orders list/detail — inline dropdown to update delivery status (read-only badge without write access).
export function OrderStatusDropdown({ order }) {
  const updateStatus = useUpdateOrderStatus()
  const { can } = usePermissions()
  const canWrite = can(PERMISSIONS.ORDERS_WRITE)

  if (!canWrite) {
    return <DeliveryStatusBadge status={order.deliveryStatus} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
        disabled={updateStatus.isPending}
      >
        <DeliveryStatusBadge status={order.deliveryStatus} />
        <CaretDown size={11} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
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
            {opt.value === order.deliveryStatus && (
              <CheckCircle size={14} weight="fill" className="ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
