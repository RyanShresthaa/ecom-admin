import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva } from 'class-variance-authority'
import { X } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

// Sheet root for slide-over panel open state.
const Sheet = DialogPrimitive.Root
// Trigger element that opens the sheet panel.
const SheetTrigger = DialogPrimitive.Trigger
// Close control for dismissing the sheet.
const SheetClose = DialogPrimitive.Close
// Portal target for rendering sheet overlay and content.
const SheetPortal = DialogPrimitive.Portal

// Backdrop overlay displayed behind the sheet panel.
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

// Side-based style variants for right and left sheet placements.
const sheetVariants = cva(
  'fixed z-50 gap-4 bg-card p-6 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-full border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md',
        left: 'inset-y-0 left-0 h-full w-full border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-md',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
)

// Slide-over content container with built-in close button.
const SheetContent = React.forwardRef(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), 'flex flex-col overflow-y-auto', className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring">
        <X size={16} weight="bold" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

// Header wrapper for sheet title and description.
const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

// Footer wrapper for sheet actions pinned near the bottom.
const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn('mt-auto flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end', className)}
    {...props}
  />
)
SheetFooter.displayName = 'SheetFooter'

// Sheet title text element.
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

// Sheet description text element.
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
