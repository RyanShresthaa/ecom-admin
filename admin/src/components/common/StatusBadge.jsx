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

// Color and icon mapping for product active/inactive states on the Products list and detail pages.
const PRODUCT_STATUS_MAP = {
  active: { variant: 'success', icon: CheckCircle, label: 'Active' },
  inactive: { variant: 'muted', icon: Circle, label: 'Inactive' },
}

// Color and icon mapping for payment states shown in Orders tables and order detail views.
const PAYMENT_STATUS_MAP = {
  Paid: { variant: 'success', icon: CheckCircle, label: 'Paid' },
  Unpaid: { variant: 'warning', icon: Clock, label: 'Unpaid' },
  Refunded: { variant: 'destructive', icon: ArrowUUpLeft, label: 'Refunded' },
  paid: { variant: 'success', icon: CheckCircle, label: 'Paid' },
  unpaid: { variant: 'warning', icon: Clock, label: 'Unpaid' },
  refunded: { variant: 'destructive', icon: ArrowUUpLeft, label: 'Refunded' },
}

// Color and icon mapping for fulfillment states on Orders list and detail pages.
const DELIVERY_STATUS_MAP = {
  Pending: { variant: 'warning', icon: Clock, label: 'Pending' },
  Shipped: { variant: 'default', icon: Truck, label: 'Shipped' },
  Delivered: { variant: 'success', icon: PackageIcon, label: 'Delivered' },
  Returned: { variant: 'destructive', icon: XCircle, label: 'Returned' },
}

// Shared badge renderer — looks up variant, icon, and label from a status map.
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

// Product catalog status pill for table columns and product detail headers.
export function ProductStatusBadge({ status }) {
  return <StatusBadgeBase map={PRODUCT_STATUS_MAP} status={status} />
}

// Payment status pill used in order rows and invoice summaries.
export function PaymentStatusBadge({ status }) {
  return <StatusBadgeBase map={PAYMENT_STATUS_MAP} status={status} />
}

// Shipping/fulfillment status pill used in order rows and fulfillment panels.
export function DeliveryStatusBadge({ status }) {
  return <StatusBadgeBase map={DELIVERY_STATUS_MAP} status={status} />
}
