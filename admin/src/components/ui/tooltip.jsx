import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils'

// Tooltip provider for shared hover/focus delay configuration.
const TooltipProvider = TooltipPrimitive.Provider
// Tooltip root that controls open state and positioning.
const Tooltip = TooltipPrimitive.Root
// Tooltip trigger that anchors tooltip interactions.
const TooltipTrigger = TooltipPrimitive.Trigger

// Tooltip content bubble with offset and animation styling.
const TooltipContent = React.forwardRef(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
