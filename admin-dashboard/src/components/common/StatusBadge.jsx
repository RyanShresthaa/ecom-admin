import {
  CheckCircle,
  Circle,
  Clock,
  PackageIcon,
  Truck,
  ArrowUUpLeft,
  XCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'

const PRODUCT_STATUS_MAP = {
  active: { variant: 'success', icon: CheckCircle, label: 'Active' },
  inactive: { variant: 'muted', icon: Circle, label: 'Inactive' },
}

const PAYMENT_STATUS_MAP = {
  Paid: { variant: 'success', icon: CheckCircle, label: 'Paid' },
  Unpaid: { variant: 'warning', icon: Clock, label: 'Unpaid' },
  Refunded: { variant: 'destructive', icon: ArrowUUpLeft, label: 'Refunded' },
}

const DELIVERY_STATUS_MAP = {
  Pending: { variant: 'warning', icon: Clock, label: 'Pending' },
  Shipped: { variant: 'default', icon: Truck, label: 'Shipped' },
  Delivered: { variant: 'success', icon: PackageIcon, label: 'Delivered' },
  Returned: { variant: 'destructive', icon: XCircle, label: 'Returned' },
}

function StatusBadgeBase({ map, status }) {
  const entry = map[status] ?? { variant: 'muted', icon: Circle, label: status }
  const Icon = entry.icon
  return (
    <Badge variant={entry.variant}>
      <Icon size={11} weight="bold" />
      {entry.label}
    </Badge>
  )
}

export function ProductStatusBadge({ status }) {
  return <StatusBadgeBase map={PRODUCT_STATUS_MAP} status={status} />
}

export function PaymentStatusBadge({ status }) {
  return <StatusBadgeBase map={PAYMENT_STATUS_MAP} status={status} />
}

export function DeliveryStatusBadge({ status }) {
  return <StatusBadgeBase map={DELIVERY_STATUS_MAP} status={status} />
}
