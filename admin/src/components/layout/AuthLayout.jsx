import { Lightning } from '@phosphor-icons/react'

// Centered card shell for unauthenticated pages (login, password reset, etc.).
export function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Lightning size={20} weight="fill" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Matina Crafts</p>
          </div>
        </div>

        <div className="animate-fade-in rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  )
}
