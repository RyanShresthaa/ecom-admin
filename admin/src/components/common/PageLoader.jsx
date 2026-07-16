import { CircleNotch } from '@phosphor-icons/react'

// Full-page or inline loading spinner shown while route data or auth state is resolving.
export function PageLoader() {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <CircleNotch size={26} className="animate-spin text-primary" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
