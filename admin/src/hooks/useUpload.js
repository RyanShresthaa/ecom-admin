import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api'

/** Upload a single image file to Cloudinary via the backend. */
export function useUploadImage() {
  return useMutation({
    mutationFn: (file) => api.upload.image(file),
    onError: (err) => toast.error(err.message || 'Image upload failed'),
  })
}
