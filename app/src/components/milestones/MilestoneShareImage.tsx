import { useEffect, useRef, useState } from 'react'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import type { Milestone } from '../../lib/milestoneData'
import { formatAgeAtDate } from '../../lib/milestoneData'

interface Props {
  milestone: Milestone
  babyName: string
  achievedAt: string
  birthDate: string
  photoUrl?: string | null
  note?: string | null
  onClose: () => void
}

/** Draw rounded rectangle */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Wrap text within maxWidth, returns array of lines */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = w
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function buildShareCanvas(
  milestone: Milestone,
  babyName: string,
  achievedAt: string,
  birthDate: string,
  photoUrl?: string | null,
  note?: string | null,
): Promise<HTMLCanvasElement> {
  const size = 1080
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#1a1145')
  grad.addColorStop(1, '#0d0a27')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // Subtle radial glow
  const glow = ctx.createRadialGradient(
    size / 2,
    size / 2,
    100,
    size / 2,
    size / 2,
    size / 1.2,
  )
  glow.addColorStop(0, 'rgba(183,159,255,0.18)')
  glow.addColorStop(1, 'rgba(183,159,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  // Top label
  ctx.fillStyle = '#b79fff'
  ctx.font = 'bold 26px Manrope, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.letterSpacing = '3px'
  ctx.fillText('🎯  YAYA BABY', size / 2, 90)

  // Circle for photo or emoji
  const cx = size / 2
  const cy = 340
  const radius = 180

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.strokeStyle = '#b79fff'
  ctx.lineWidth = 6
  ctx.stroke()

  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl)
      ctx.save()
      ctx.clip()
      // cover fit
      const scale = Math.max(
        (radius * 2) / img.width,
        (radius * 2) / img.height,
      )
      const drawW = img.width * scale
      const drawH = img.height * scale
      ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
      ctx.restore()
    } catch {
      ctx.font = '160px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(milestone.emoji, cx, cy + 10)
    }
  } else {
    ctx.font = '180px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(milestone.emoji, cx, cy + 10)
  }
  ctx.restore()

  // Milestone name (wrap)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 62px Manrope, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const nameLines = wrapText(ctx, milestone.name, size - 160)
  let nameY = 600
  for (const line of nameLines) {
    ctx.fillText(line, size / 2, nameY)
    nameY += 72
  }

  // Sub: "{nome} com X meses e Y dias"
  const ageLabel = formatAgeAtDate(birthDate, achievedAt)
  ctx.fillStyle = 'rgba(231,226,255,0.75)'
  ctx.font = '36px Manrope, system-ui, sans-serif'
  const subY = Math.max(nameY + 30, 720)
  ctx.fillText(`${babyName} · ${ageLabel}`, size / 2, subY)

  // Date
  const dateLabel = new Date(achievedAt + 'T12:00:00').toLocaleDateString(
    'pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' },
  )
  ctx.fillStyle = 'rgba(231,226,255,0.5)'
  ctx.font = '28px Manrope, system-ui, sans-serif'
  ctx.fillText(dateLabel, size / 2, subY + 44)

  // Note (italic, wrapped)
  if (note && note.trim()) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = 'italic 30px Manrope, system-ui, sans-serif'
    const lines = wrapText(ctx, `“${note.trim()}”`, size - 200)
    let ny = subY + 110
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, size / 2, ny)
      ny += 40
    }
  }

  // Footer brand bar
  roundedRect(ctx, 340, size - 130, 400, 70, 35)
  ctx.fillStyle = 'rgba(183,159,255,0.12)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(183,159,255,0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#b79fff'
  ctx.font = 'bold 30px Manrope, system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('yayababy.app', size / 2, size - 95)

  return canvas
}

export default function MilestoneShareImage({
  milestone,
  babyName,
  achievedAt,
  birthDate,
  photoUrl,
  note,
  onClose,
}: Props) {
  const previewRef = useRef<HTMLImageElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    buildShareCanvas(
      milestone,
      babyName,
      achievedAt,
      birthDate,
      photoUrl,
      note,
    )
      .then((c) => {
        if (cancelled) return
        setDataUrl(c.toDataURL('image/png'))
      })
      .catch(() => {
        if (cancelled) return
        setError('Não foi possível gerar a imagem.')
      })
    return () => {
      cancelled = true
    }
  }, [milestone, babyName, achievedAt, birthDate, photoUrl, note])

  const handleShare = async () => {
    if (!dataUrl || busy) return
    setBusy(true)
    try {
      if (Capacitor.isNativePlatform()) {
        // Save to cache then share via Capacitor Share
        const base64 = dataUrl.split(',')[1]
        const fileName = `yaya-${milestone.code}-${Date.now()}.png`
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        })
        await Share.share({
          title: 'Marco de desenvolvimento',
          text: `${babyName} alcançou: ${milestone.name}`,
          url: saved.uri,
          dialogTitle: 'Compartilhar marco',
        })
      } else if (navigator.share && 'canShare' in navigator) {
        // Web Share API
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `marco-${milestone.code}.png`, {
          type: 'image/png',
        })
        const shareData: ShareData = {
          title: 'Marco de desenvolvimento',
          text: `${babyName} alcançou: ${milestone.name}`,
          files: [file],
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((navigator as any).canShare?.(shareData)) {
          await navigator.share(shareData)
        } else {
          // fallback: download
          const a = document.createElement('a')
          a.href = dataUrl
          a.download = `marco-${milestone.code}.png`
          a.click()
        }
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `marco-${milestone.code}.png`
        a.click()
      }
    } catch {
      // user cancelled or failed silently
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between px-5 pt-6">
        <button
          type="button"
          onClick={onClose}
          className="text-white/80"
          aria-label="Fechar"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
        <span className="font-label text-xs uppercase tracking-wider text-white/60">
          Compartilhar marco
        </span>
        <div className="w-8" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        {error && (
          <p className="font-label text-sm text-white/70 text-center">
            {error}
          </p>
        )}
        {!error && !dataUrl && (
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">
            progress_activity
          </span>
        )}
        {dataUrl && (
          <img
            ref={previewRef}
            src={dataUrl}
            alt="Prévia do marco"
            className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl"
          />
        )}
      </div>

      <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          disabled={!dataUrl || busy}
          onClick={handleShare}
          className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">share</span>
          {busy ? 'Compartilhando...' : 'Compartilhar imagem'}
        </button>
      </div>
    </div>
  )
}
