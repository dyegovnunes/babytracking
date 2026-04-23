import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect } from 'react'
import EditorToolbar from './EditorToolbar'

interface Props {
  initialContent: string
  onChange: (markdown: string) => void
}

export default function TiptapEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: 'Escreva o conteúdo do post aqui…' }),
      Markdown.configure({ transformPastedText: true, transformCopiedText: true }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown()
      onChange(md)
    },
  })

  // Atualiza conteúdo quando o post muda (ex: navegar entre posts)
  useEffect(() => {
    if (editor && initialContent !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(initialContent)
    }
  }, [initialContent])

  return (
    <div
      className="rounded-md overflow-hidden border"
      style={{ borderColor: 'rgba(183,159,255,0.2)', background: 'rgba(183,159,255,0.03)' }}
    >
      <EditorToolbar editor={editor} />
      <div className="p-4 min-h-[500px]">
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .tiptap-editor-content {
          outline: none;
          line-height: 1.7;
          color: rgba(231,226,255,0.85);
          font-size: 15px;
          min-height: 460px;
        }
        .tiptap-editor-content h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin: 1.5rem 0 0.75rem;
          color: #e7e2ff;
          font-family: Manrope, sans-serif;
        }
        .tiptap-editor-content h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 1.25rem 0 0.5rem;
          color: #e7e2ff;
          font-family: Manrope, sans-serif;
        }
        .tiptap-editor-content p {
          margin: 0 0 0.9rem;
        }
        .tiptap-editor-content strong { color: #e7e2ff; font-weight: 700; }
        .tiptap-editor-content em { color: rgba(231,226,255,0.8); }
        .tiptap-editor-content a { color: #b79fff; text-decoration: underline; }
        .tiptap-editor-content blockquote {
          border-left: 3px solid rgba(183,159,255,0.4);
          padding-left: 1rem;
          color: rgba(231,226,255,0.6);
          margin: 1rem 0;
          font-style: italic;
        }
        .tiptap-editor-content code {
          background: rgba(183,159,255,0.1);
          padding: 0.1em 0.35em;
          border-radius: 4px;
          font-size: 0.875em;
          color: #b79fff;
        }
        .tiptap-editor-content ul, .tiptap-editor-content ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0 0.9rem;
        }
        .tiptap-editor-content li { margin-bottom: 0.25rem; }
        .tiptap-editor-content img { max-width: 100%; border-radius: 6px; margin: 1rem 0; }
        .tiptap-editor-content hr { border: none; border-top: 1px solid rgba(183,159,255,0.2); margin: 1.5rem 0; }
        .tiptap-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(231,226,255,0.25);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  )
}
