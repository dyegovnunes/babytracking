// ShareableImage — gera uma imagem 9:16 (Stories) compartilhável quando
// o leitor conclui o guia. Implementação client-side com Canvas 2D
// (sem html2canvas) — controle total e sem dependência extra.
//
// Botão "Compartilhar":
//   - mobile: tenta Web Share API (compartilha file)
//   - fallback (desktop ou Web Share não suportada): faz download da imagem

import { useEffect, useRef, useState } from 'react'
import type { Guide } from '../../types'

interface Props {
  guide: Guide
  caption: string  // ex: "Concluí o Guia das Últimas Semanas no Yaya 💜"
  onShare?: () => void
}

const W = 1080  // Stories padrão
const H = 1920

export default function ShareableImage({ guide, caption, onShare }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    setGenerating(true)

    async function render() {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Background gradient roxo-night Yaya
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#1a1240')
      grad.addColorStop(0.5, '#0d0a27')
      grad.addColorStop(1, '#06041a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Glow radial roxo no topo
      const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 900)
      glow.addColorStop(0, 'rgba(183, 159, 255, 0.4)')
      glow.addColorStop(1, 'rgba(183, 159, 255, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, 900)

      // Carrega cover do guia (se disponível) e desenha
      let coverImg: HTMLImageElement | null = null
      if (guide.cover_image_url) {
        try {
          coverImg = await loadImage(guide.cover_image_url)
        } catch { /* ignore — segue sem cover */ }
      }

      if (cancelled) return

      // Cover centralizado, ~660x880, com border-radius simulado e shadow
      if (coverImg) {
        const cw = 720
        const ch = 960
        const cx = (W - cw) / 2
        const cy = 320
        // Sombra
        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 60
        ctx.shadowOffsetY = 20
        roundRect(ctx, cx, cy, cw, ch, 36)
        ctx.fillStyle = '#0d0a27'
        ctx.fill()
        ctx.restore()

        // Imagem clipada com radius
        ctx.save()
        roundRect(ctx, cx, cy, cw, ch, 36)
        ctx.clip()
        // cover-fit: scale pra preencher mantendo aspect
        const ar = coverImg.width / coverImg.height
        const targetAr = cw / ch
        let drawW = cw, drawH = ch, drawX = cx, drawY = cy
        if (ar > targetAr) {
          drawW = ch * ar
          drawX = cx - (drawW - cw) / 2
        } else {
          drawH = cw / ar
          drawY = cy - (drawH - ch) / 2
        }
        ctx.drawImage(coverImg, drawX, drawY, drawW, drawH)
        ctx.restore()
      }

      // Eyebrow "VOCÊ CONCLUIU" no topo
      ctx.fillStyle = '#b79fff'
      ctx.font = '700 36px "Plus Jakarta Sans", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.letterSpacing = '6px' as never
      ctx.fillText('VOCÊ CONCLUIU 💜', W / 2, 200)

      // Título do guia (caption central)
      const titleY = 1380
      ctx.fillStyle = '#ffffff'
      ctx.font = '700 72px "Fraunces", Georgia, serif'
      wrapText(ctx, caption, W / 2, titleY, 920, 92)

      // Footer com brand Yaya
      ctx.font = '700 32px "Plus Jakarta Sans", system-ui, sans-serif'
      ctx.fillStyle = '#b79fff'
      ctx.fillText('Sua Biblioteca Yaya', W / 2, H - 200)

      ctx.font = '500 26px "Plus Jakarta Sans", system-ui, sans-serif'
      ctx.fillStyle = 'rgba(231, 226, 255, 0.6)'
      ctx.fillText('yayababy.app', W / 2, H - 145)

      if (cancelled) return

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      setPreviewUrl(dataUrl)
      setGenerating(false)
    }

    render()
    return () => { cancelled = true }
  }, [guide, caption])

  async function handleShare() {
    if (!canvasRef.current || !previewUrl) return
    setShareStatus('sharing')
    try {
      const blob: Blob | null = await new Promise(res => {
        canvasRef.current!.toBlob(b => res(b), 'image/jpeg', 0.92)
      })
      if (!blob) throw new Error('blob nulo')

      const file = new File([blob], `${guide.slug}-concluido.jpg`, { type: 'image/jpeg' })

      // Tenta Web Share API com files (mobile)
      if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Sua Biblioteca Yaya',
          text: caption,
        })
        setShareStatus('shared')
        onShare?.()
        setTimeout(() => setShareStatus('idle'), 2000)
        return
      }

      // Fallback: download da imagem
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${guide.slug}-concluido.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShareStatus('shared')
      onShare?.()
      setTimeout(() => setShareStatus('idle'), 2000)
    } catch (err) {
      console.warn('[ShareableImage] erro ao compartilhar:', err)
      setShareStatus('error')
      setTimeout(() => setShareStatus('idle'), 2000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {/* Canvas escondido pro render */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Preview pequeno */}
      {previewUrl && (
        <div
          style={{
            width: 200,
            aspectRatio: '9 / 16',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--r-border-strong)',
            boxShadow: '0 12px 32px var(--r-shadow)',
          }}
        >
          <img
            src={previewUrl}
            alt="Prévia da imagem compartilhável"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Botão compartilhar */}
      <button
        onClick={handleShare}
        disabled={generating || !previewUrl || shareStatus === 'sharing'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 22px',
          borderRadius: 999,
          border: 'none',
          background: shareStatus === 'shared' ? 'var(--r-accent-glow)' : 'var(--r-accent)',
          color: 'var(--r-on-accent)',
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          cursor: generating ? 'wait' : 'pointer',
          minHeight: 44,
          opacity: generating ? 0.6 : 1,
          transition: 'background 0.2s',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {shareStatus === 'shared' ? 'check' : 'ios_share'}
        </span>
        {generating
          ? 'Gerando…'
          : shareStatus === 'sharing'
          ? 'Compartilhando…'
          : shareStatus === 'shared'
          ? 'Pronto!'
          : shareStatus === 'error'
          ? 'Tenta de novo'
          : 'Compartilhar'}
      </button>
    </div>
  )
}

// ── Helpers de canvas ──────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Quebra texto multi-linha centralizado verticalmente */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const testLine = line ? `${line} ${w}` : w
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = testLine
    }
  }
  if (line) lines.push(line)

  const totalH = lines.length * lineHeight
  const startY = centerY - totalH / 2
  lines.forEach((l, i) => {
    ctx.fillText(l, centerX, startY + (i + 0.7) * lineHeight)
  })
}
