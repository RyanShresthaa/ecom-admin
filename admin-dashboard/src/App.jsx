import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'

import { AppRoutes } from '@/routes'
import { AuthProvider } from '@/context/AuthContext'
import { LocaleProvider } from '@/context/LocaleContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocaleProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </BrowserRouter>
        </LocaleProvider>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
