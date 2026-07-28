import { useNavigate } from 'react-router-dom'
import { Bell, Check, SpinnerGap } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useNotificationsQuery,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationsDropdown() {
  const navigate = useNavigate()
  const { data: notifications = [], isLoading } = useNotificationsQuery()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter((n) => !n.read).length

  function handleNotificationClick(notification) {
    if (!notification.read) {
      markRead.mutate(notification.id)
    }
    navigate(notification.href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                markAllRead.mutate()
              }}
              disabled={markAllRead.isPending}
            >
              <Check size={12} />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <SpinnerGap size={16} className="animate-spin" />
            Loading…
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications</p>
        )}

        {!isLoading &&
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 p-3"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span
                  className={cn(
                    'text-sm leading-snug',
                    !notification.read && 'font-semibold text-foreground'
                  )}
                >
                  {notification.title}
                </span>
                {!notification.read && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{notification.body}</span>
              <span className="text-[11px] text-muted-foreground/80">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
