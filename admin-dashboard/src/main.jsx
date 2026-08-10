import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider, PostHogErrorBoundary } from '@posthog/react'

import App from '@/App.jsx'
import '@/index.css'

const posthogKey = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  capture_exceptions: true,
}

function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please refresh the page.
        </p>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))

root.render(
  <StrictMode>
    {posthogKey ? (
      <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
        <PostHogErrorBoundary fallback={<ErrorFallback />}>
          <App />
        </PostHogErrorBoundary>
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>
)
