import { useState } from 'react'
import { CheckSquare, SpinnerGap } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBulkUpdateOrderStatus } from '@/hooks/useOrders'

export function BulkStatusBar({ selectedIds, onClear }) {
  const [deliveryStatus, setDeliveryStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const bulkUpdate = useBulkUpdateOrderStatus()

  if (!selectedIds.length) return null

  function handleApply() {
    if (!deliveryStatus && !paymentStatus) return
    bulkUpdate.mutate(
      {
        ids: selectedIds,
        ...(deliveryStatus ? { deliveryStatus } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      {
        onSuccess: () => {
          setDeliveryStatus('')
          setPaymentStatus('')
          onClear()
        },
      }
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <CheckSquare size={16} weight="fill" className="text-primary" />
        {selectedIds.length} selected
      </span>

      <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
        <SelectTrigger className="h-8 w-[140px] bg-card">
          <SelectValue placeholder="Delivery status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Shipped">Shipped</SelectItem>
          <SelectItem value="Delivered">Delivered</SelectItem>
          <SelectItem value="Returned">Returned</SelectItem>
        </SelectContent>
      </Select>

      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
        <SelectTrigger className="h-8 w-[130px] bg-card">
          <SelectValue placeholder="Payment status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Paid">Paid</SelectItem>
          <SelectItem value="Unpaid">Unpaid</SelectItem>
          <SelectItem value="Refunded">Refunded</SelectItem>
        </SelectContent>
      </Select>

      <Button
        size="sm"
        className="gap-1.5"
        onClick={handleApply}
        disabled={(!deliveryStatus && !paymentStatus) || bulkUpdate.isPending}
      >
        {bulkUpdate.isPending ? <SpinnerGap size={14} className="animate-spin" /> : null}
        Apply to selected
      </Button>

      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  )
}
