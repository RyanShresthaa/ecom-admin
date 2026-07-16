import { cn } from '@/lib/utils'

// Animated placeholder block for loading states and content previews.
function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
