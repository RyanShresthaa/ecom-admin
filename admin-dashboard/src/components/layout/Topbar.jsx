import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, MagnifyingGlass, CaretDown, SignOut, UserCircle, GearSix } from '@phosphor-icons/react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlobalSearchDialog } from '@/components/layout/GlobalSearchDialog'
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown'
import { useAuth } from '@/context/AuthContext'
import { useProfileQuery } from '@/hooks/useProfile'
import { getInitials } from '@/lib/utils'

export function Topbar({ onMenuClick, title }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { data: user } = useProfileQuery()
  const [searchOpen, setSearchOpen] = useState(false)

  const displayName = user?.name ?? 'Admin'
  const displayEmail = user?.email ?? 'admin@gmail.com'

  async function handleLogout() {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch (err) {
      toast.error(err.message || 'Logout failed')
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
        >
          <List size={20} />
        </button>

        <h2 className="hidden text-sm font-semibold text-foreground sm:block">{title}</h2>

        <div className="relative ml-auto hidden w-full max-w-sm md:block">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search orders, products, customers…"
            className="cursor-pointer pl-8"
            readOnly
            onClick={() => setSearchOpen(true)}
            onFocus={() => setSearchOpen(true)}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:ml-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlass size={18} />
          </Button>

          <NotificationsDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md py-1 pl-1.5 pr-2 hover:bg-secondary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(displayName)}
                </div>
                <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
                <CaretDown size={12} className="hidden text-muted-foreground sm:inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{displayName}</p>
                <p className="text-xs font-normal text-muted-foreground">{displayEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <UserCircle size={16} /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <GearSix size={16} /> Account settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <SignOut size={16} /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
