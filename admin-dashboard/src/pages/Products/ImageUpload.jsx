import { useRef } from 'react'
import { Image, SpinnerGap, X } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ImageUpload({ image, onUpload, onRemove, isUploading, className }) {
  const inputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      onUpload(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className={cn(
          'relative flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/30',
          !image && 'cursor-pointer hover:border-primary/50 hover:bg-secondary/50'
        )}
        onClick={() => !image && inputRef.current?.click()}
      >
        {image ? (
          <>
            <img src={image} alt="Product" className="h-full w-full object-cover" />
            {onRemove && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
              >
                <X size={14} />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Image size={32} />
            <span className="text-xs">Click to upload</span>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <SpinnerGap size={24} className="animate-spin text-primary" />
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {image && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-[240px]"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          Replace image
        </Button>
      )}
    </div>
  )
}
