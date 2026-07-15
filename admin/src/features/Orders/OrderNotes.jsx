import { useState } from 'react'
import { PaperPlaneTilt, SpinnerGap } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAddOrderNote } from '@/hooks/useOrders'
import { useAuth } from '@/context/AuthContext'
import { formatDateTime } from '@/lib/utils'

export function OrderNotes({ order, canWrite }) {
  const [text, setText] = useState('')
  const addNote = useAddOrderNote()
  const { user } = useAuth()

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    addNote.mutate(
      { id: order.id, text: text.trim(), author: user?.name },
      { onSuccess: () => setText('') }
    )
  }

  const notes = order.internalNotes || []

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No internal notes yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-sm text-foreground">{note.text}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {note.author} · {formatDateTime(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {canWrite && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add an internal note…"
            rows={3}
          />
          <Button type="submit" size="sm" className="w-fit gap-1.5" disabled={!text.trim() || addNote.isPending}>
            {addNote.isPending ? <SpinnerGap size={14} className="animate-spin" /> : <PaperPlaneTilt size={14} />}
            Add note
          </Button>
        </form>
      )}
    </div>
  )
}
