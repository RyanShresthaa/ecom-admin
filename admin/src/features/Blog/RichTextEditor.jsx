import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  Quotes,
  Link as LinkIcon,
  LinkSimple,
  TextHOne,
  TextHTwo,
  TextHThree,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  Minus,
  ArrowCounterClockwise,
  ArrowClockwise,
  Image as ImageIcon,
} from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUploadImage } from '@/hooks/useUpload'

function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 shrink-0', active && 'bg-muted')}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </Button>
  )
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-border" />
}

export function RichTextEditor({ value, onChange, onFocus, disabled }) {
  const lastExternalValue = useRef(value)
  const imageInputRef = useRef(null)
  const uploadImage = useUploadImage()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'blog-inline-image' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write your article…' }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      const normalized = html === '<p></p>' ? '' : html
      lastExternalValue.current = normalized
      onChange(normalized)
    },
    onFocus: () => onFocus?.(),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[220px] px-3 py-3 focus:outline-none [&_p]:my-2 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_ul]:my-2 [&_ol]:my-2 [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!editor) return
    if (value === lastExternalValue.current) return
    lastExternalValue.current = value
    const next = value || '<p></p>'
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, false)
    }
  }, [editor, value])

  if (!editor) return null

  function setLink() {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Link URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return
    if (!file.type.startsWith('image/')) return
    try {
      const url = await uploadImage.mutateAsync(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch {
      // toast handled by mutation
    }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-background',
        disabled && 'opacity-60'
      )}
    >
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
          <ToolbarButton
            title="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
          >
            <ArrowCounterClockwise size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
          >
            <ArrowClockwise size={16} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <TextB size={16} weight="bold" />
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <TextItalic size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <TextUnderline size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <TextStrikethrough size={16} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <TextHOne size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <TextHTwo size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <TextHThree size={16} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <ListBullets size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListNumbers size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quotes size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Horizontal line"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus size={16} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Align left"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <TextAlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Align center"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <TextAlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Align right"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <TextAlignRight size={16} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton title="Add link" active={editor.isActive('link')} onClick={setLink}>
            <LinkIcon size={16} />
          </ToolbarButton>
          <ToolbarButton
            title="Remove link"
            disabled={!editor.isActive('link')}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <LinkSimple size={16} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Insert image"
            disabled={uploadImage.isPending}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon size={16} />
          </ToolbarButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
