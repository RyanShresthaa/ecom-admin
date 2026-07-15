'use client'

import { useRouter } from 'next/navigation'
import {
  Bell,
  Package,
  ShoppingCartSimple,
  CreditCard,
  SpinnerGap,
  CheckCircle,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  useNotificationsQuery,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'

const TYPE_ICONS = {
  order: ShoppingCartSimple,
  inventory: Package,
  payment: CreditCard,
}

export function NotificationsPanel() {
  const router = useRouter()
  const { data: notifications = [], isLoading } = useNotificationsQuery()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const unreadCount = notifications.filter((n) => !n.read).length

  function handleNotificationClick(notification) {
    if (!notification.read) {
      markRead.mutate(notification.id)
    }
    router.push(notification.href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCircle size={14} />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <SpinnerGap size={16} className="animate-spin" />
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">No notifications</p>
        ) : (
          <div className="max-h-80 overflow-y-auto p-1">
            {notifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? Bell
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-secondary',
                    !notification.read && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      notification.read ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
                    )}
                  >
                    <Icon size={14} />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{notification.title}</span>
                      {!notification.read && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {notification.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
