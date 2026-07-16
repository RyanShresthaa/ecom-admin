import { useNavigate } from 'react-router-dom'
import { List, CaretDown, SignOut, UserCircle, GearSix } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABELS } from '@/lib/permissions'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { NotificationsPanel } from '@/components/layout/NotificationsPanel'

// Sticky header on every dashboard page — page title, search, notifications, and account menu.
export function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Clear the session and return the user to the login screen.
  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <List size={20} />
      </button>

      <h2 className="hidden text-sm font-semibold text-foreground sm:block">{title}</h2>

      <GlobalSearch />

      <div className="flex items-center gap-1.5">
        <NotificationsPanel />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md py-1 pl-1.5 pr-2 hover:bg-secondary">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(user?.name ?? '')}
              </div>
              <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
              <CaretDown size={12} className="hidden text-muted-foreground sm:inline" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{user?.name}</p>
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  {ROLE_LABELS[user?.role] ?? user?.role}
                </span>
              </div>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserCircle size={16} /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/account')}>
              <GearSix size={16} /> Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <SignOut size={16} /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
