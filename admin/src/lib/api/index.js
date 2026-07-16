// API barrel: exposes the active API adapter and shared error/config helpers.
export { backendApi as api } from '@/lib/api/backend-api'
export { isApiConfigured } from '@/lib/http'
export { ApiError, ApiNotConfiguredError } from '@/lib/http'
