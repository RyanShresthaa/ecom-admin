import { useEffect, useRef, useState } from 'react'
import { Image, SpinnerGap, UploadSimple, WarningCircle, X } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUploadImage } from '@/hooks/useUpload'
import { isLikelyDirectImageUrl, normalizeImageUrl } from '@/lib/imageUrl'

/** Cover image picker — paste a URL or upload from device with live preview. */
export function CoverImageField({ value, onChange, disabled }) {
  const inputRef = useRef(null)
  const upload = useUploadImage()
  const [broken, setBroken] = useState(false)
  const [urlHint, setUrlHint] = useState('')

  const cover = value?.trim()

  useEffect(() => {
    setBroken(false)
    setUrlHint('')
  }, [cover])

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    if (!file.type.startsWith('image/')) return

    const url = await upload.mutateAsync(file)
    onChange(url)
  }

  function handleUrlChange(raw) {
    const next = raw
    onChange(next)
    setBroken(false)
    setUrlHint('')
  }

  function handleUrlBlur() {
    const normalized = normalizeImageUrl(value)
    if (normalized === null) {
      setUrlHint(
        'That looks like a Google Images page, not a direct image link. Right-click the image → “Copy image address”, or use Upload.'
      )
      setBroken(true)
      return
    }
    if (normalized && normalized !== value) {
      onChange(normalized)
    }
    if (normalized && !isLikelyDirectImageUrl(normalized)) {
      setUrlHint('Use a direct image URL (ends with .jpg/.png) or upload from your device.')
    }
  }

  return (
    <div className="space-y-3">
      {cover && !broken ? (
        <div className="relative overflow-hidden rounded-md border bg-muted/30">
          <img
            src={cover}
            alt="Cover preview"
            className="h-40 w-full object-cover"
            onError={() => {
              setBroken(true)
              setUrlHint(
                'This link does not load as an image (common with Google search / Drive share pages). Upload from your device, or paste a direct image URL.'
              )
            }}
          />
          {!disabled && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7"
              onClick={() => onChange('')}
              aria-label="Remove cover image"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 px-4 text-center text-muted-foreground">
          {broken ? <WarningCircle size={28} className="text-destructive" /> : <Image size={28} />}
          <span className="text-xs">{broken ? 'Image failed to load' : 'No cover image yet'}</span>
        </div>
      )}

      {urlHint && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{urlHint}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Direct image URL, or upload from device"
          disabled={disabled || upload.isPending}
        />
        {!disabled && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 shrink-0"
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : (
                <UploadSimple size={16} />
              )}
              Upload
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
