import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef((props, ref) => {
  const { className, type, value, ...rest } = props
  // Keep controlled inputs stable: value={undefined} → "" so React doesn't
  // warn about switching from uncontrolled → controlled.
  const controlled = Object.prototype.hasOwnProperty.call(props, 'value')

  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-soft transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...rest}
      {...(controlled ? { value: value ?? '' } : {})}
    />
  )
})
Input.displayName = 'Input'

export { Input }
