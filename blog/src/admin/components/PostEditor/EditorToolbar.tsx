import type { Editor } from '@tiptap/react'

interface Props {
  editor: Editor | null
}

interface ToolbarButton {
  label: string
  icon: string
  action: () => void
  isActive?: boolean
  title: string
}

export default function EditorToolbar({ editor }: Props) {
  if (!editor) return null

  const buttons: ToolbarButton[] = [
    {
      label: 'B',
      icon: '',
      title: 'Negrito',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      label: 'I',
      icon: '',
      title: 'Itálico',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      label: 'H2',
      icon: '',
      title: 'Título H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'H3',
      icon: '',
      title: 'Título H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
  ]

  function addLink() {
    const url = window.prompt('URL do link:')
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
  }

  function removeLink() {
    editor.chain().focus().unsetLink().run()
  }

  function addImage() {
    const url = window.prompt('URL da imagem:')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  const activeStyle = {
    background: 'rgba(183,159,255,0.2)',
    color: '#b79fff',
    borderColor: 'rgba(183,159,255,0.4)',
  }

  const baseStyle = {
    background: 'transparent',
    color: 'rgba(231,226,255,0.7)',
    borderColor: 'rgba(183,159,255,0.15)',
  }

  const btnBase = 'px-2.5 py-1 rounded border cursor-pointer text-sm transition-all hover:opacity-100'

  return (
    <div
      className="flex flex-wrap items-center gap-1 px-3 py-2 border-b"
      style={{ borderColor: 'rgba(183,159,255,0.15)', background: 'rgba(183,159,255,0.04)' }}
    >
      {/* Negrito / Itálico */}
      {buttons.map(btn => (
        <button
          key={btn.title}
          title={btn.title}
          onMouseDown={e => { e.preventDefault(); btn.action() }}
          className={btnBase}
          style={btn.isActive ? activeStyle : baseStyle}
        >
          <span style={{ fontWeight: btn.label === 'B' ? 700 : 400, fontStyle: btn.label === 'I' ? 'italic' : 'normal' }}>
            {btn.label}
          </span>
        </button>
      ))}

      <div className="w-px h-4 mx-1" style={{ background: 'rgba(183,159,255,0.2)' }} />

      {/* Listas */}
      <button
        title="Lista com marcadores"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
        className={btnBase}
        style={editor.isActive('bulletList') ? activeStyle : baseStyle}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>format_list_bulleted</span>
      </button>
      <button
        title="Lista numerada"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
        className={btnBase}
        style={editor.isActive('orderedList') ? activeStyle : baseStyle}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>format_list_numbered</span>
      </button>

      <div className="w-px h-4 mx-1" style={{ background: 'rgba(183,159,255,0.2)' }} />

      {/* Blockquote / Code */}
      <button
        title="Citação"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}
        className={btnBase}
        style={editor.isActive('blockquote') ? activeStyle : baseStyle}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>format_quote</span>
      </button>
      <button
        title="Código inline"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCode().run() }}
        className={btnBase}
        style={editor.isActive('code') ? activeStyle : baseStyle}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>code</span>
      </button>

      <div className="w-px h-4 mx-1" style={{ background: 'rgba(183,159,255,0.2)' }} />

      {/* Link */}
      <button
        title={editor.isActive('link') ? 'Remover link' : 'Adicionar link'}
        onMouseDown={e => { e.preventDefault(); editor.isActive('link') ? removeLink() : addLink() }}
        className={btnBase}
        style={editor.isActive('link') ? activeStyle : baseStyle}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>
          {editor.isActive('link') ? 'link_off' : 'link'}
        </span>
      </button>

      {/* Imagem */}
      <button
        title="Inserir imagem"
        onMouseDown={e => { e.preventDefault(); addImage() }}
        className={btnBase}
        style={baseStyle}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>image</span>
      </button>

      <div className="w-px h-4 mx-1" style={{ background: 'rgba(183,159,255,0.2)' }} />

      {/* Desfazer / Refazer */}
      <button
        title="Desfazer"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run() }}
        className={btnBase}
        style={baseStyle}
        disabled={!editor.can().undo()}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>undo</span>
      </button>
      <button
        title="Refazer"
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run() }}
        className={btnBase}
        style={baseStyle}
        disabled={!editor.can().redo()}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16, lineHeight: 1 }}>redo</span>
      </button>
    </div>
  )
}
