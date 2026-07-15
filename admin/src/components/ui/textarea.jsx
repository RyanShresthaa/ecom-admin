import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef((props, ref) => {
  const { className, value, ...rest } = props
  const controlled = Object.prototype.hasOwnProperty.call(props, 'value')

  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...rest}
      {...(controlled ? { value: value ?? '' } : {})}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
