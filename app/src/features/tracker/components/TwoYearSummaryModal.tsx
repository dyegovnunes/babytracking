/**
 * TwoYearSummaryModal — resumo visual celebratório dos 2 anos de uso do Yaya.
 * Dois modos: "Resumo" (stats UI) e "Imagem" (canvas 1080×1080 para share).
 * Padrão idêntico ao MilestoneShareImage (Capacitor Share + Web Share API).
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticSuccess, hapticLight } from '../../../lib/haptics'
import type { Baby, LogEntry } from '../../../types'

interface Props {
  baby: Baby
  logs: LogEntry[]
  milestoneCount: number
  longestStreak: number
  onClose: () => void
}

// ─── canvas helpers ────────────────────────────────────────────────────────

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// ─── canvas builder ────────────────────────────────────────────────────────

async function buildCanvas(
  babyName: string,
  totalLogs: number,
  feedSessions: number,
  milestoneCount: number,
  longestStreak: number,
): Promise<HTMLCanvasElement> {
  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background gradient — dark purple (mesmo do MilestoneShareImage)
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1a1145')
  bg.addColorStop(1, '#0d0a27')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Radial glow levemente dourado
  const glow = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W / 1.3)
  glow.addColorStop(0, 'rgba(255,215,100,0.12)')
  glow.addColorStop(0.5, 'rgba(183,159,255,0.10)')
  glow.addColorStop(1, 'rgba(183,159,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Pontos decorativos fixos (sem Math.random para resultado determinístico)
  const dotColors = ['#b79fff', '#ffd77a', '#7affb7', '#ff9f7a', '#ff7ab7']
  const dotPositions: [number, number, number][] = [
    [120, 160, 7], [960, 200, 5], [80, 600, 8], [1010, 580, 6],
    [200, 900, 5], [880, 920, 7], [340, 80, 4], [720, 70, 6],
    [160, 420, 5], [940, 400, 8], [500, 1020, 6], [60, 780, 5],
    [1020, 760, 7], [280, 970, 4], [800, 990, 6], [440, 30, 5],
  ]
  dotPositions.forEach(([x, y, r], i) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = dotColors[i % dotColors.length] + '65'
    ctx.fill()
  })

  // Top label (dourado)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffd77a'
  ctx.font = 'bold 28px Manrope, system-ui, sans-serif'
  ctx.fillText('🎂  2 ANOS · YAYA BABY', W / 2, 88)

  // Círculo central com "2"
  const cx = W / 2
  const cy = 310
  const radius = 155

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,215,100,0.07)'
  ctx.fill()
  ctx.strokeStyle = '#ffd77a'
  ctx.lineWidth = 7
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 220px Manrope, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('2', cx, cy + 14)

  // Nome do bebê
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 66px Manrope, system-ui, sans-serif'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(babyName, W / 2, 540)

  // Subtítulo
  ctx.fillStyle = 'rgba(255,215,100,0.85)'
  ctx.font = '34px Manrope, system-ui, sans-serif'
  ctx.fillText('anos de registros no Yaya', W / 2, 592)

  // Grid de stats — 2×2
  const statCards = [
    { value: totalLogs.toLocaleString('pt-BR'), label: 'registros no total' },
    { value: String(milestoneCount),            label: 'marcos atingidos' },
    { value: feedSessions.toLocaleString('pt-BR'), label: 'mamadas registradas' },
    { value: `${longestStreak}d`,               label: 'maior sequência' },
  ]

  const cardW = 462
  const cardH = 96
  const gapX  = 16
  const gapY  = 14
  const gridLeft = (W - (cardW * 2 + gapX)) / 2
  const gridTop  = 645

  statCards.forEach((card, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = gridLeft + col * (cardW + gapX)
    const y = gridTop  + row * (cardH + gapY)

    roundedRect(ctx, x, y, cardW, cardH, 18)
    ctx.fillStyle = 'rgba(183,159,255,0.13)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(183,159,255,0.32)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 42px Manrope, system-ui, sans-serif'
    ctx.fillText(card.value, x + cardW / 2, y + cardH / 2 - 13)

    ctx.fillStyle = 'rgba(231,226,255,0.6)'
    ctx.font = '23px Manrope, system-ui, sans-serif'
    ctx.fillText(card.label, x + cardW / 2, y + cardH / 2 + 25)
  })

  // Footer brand bar (mesmo do MilestoneShareImage)
  roundedRect(ctx, 340, H - 130, 400, 70, 35)
  ctx.fillStyle = 'rgba(183,159,255,0.12)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(183,159,255,0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#b79fff'
  ctx.font = 'bold 30px Manrope, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('yayababy.app', W / 2, H - 95)

  return canvas
}

// ─── component ─────────────────────────────────────────────────────────────

export default function TwoYearSummaryModal({ baby, logs, milestoneCount, longestStreak, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const imgRef = useRef<HTMLImageElement>(null)
  const [dataUrl, setDataUrl]     = useState<string | null>(null)
  const [busy, setBusy]           = useState(false)
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const [view, setView]           = useState<'stats' | 'canvas'>('stats')

  // ── estatísticas ──
  const stats = useMemo(() => {
    const FEED_IDS   = ['breast_left', 'breast_right', 'breast_both', 'bottle']
    const DIAPER_IDS = ['diaper_wet', 'diaper_dirty']
    return {
      totalLogs:    logs.length,
      feedSessions: logs.filter((l) => FEED_IDS.includes(l.eventId)).length,
      diapers:      logs.filter((l) => DIAPER_IDS.includes(l.eventId)).length,
      baths:        logs.filter((l) => l.eventId === 'bath').length,
      sleepSessions:logs.filter((l) => l.eventId === 'sleep').length,
      meals:        logs.filter((l) => l.eventId === 'meal').length,
    }
  }, [logs])

  // ── gera canvas só quando muda para a aba de imagem ──
  useEffect(() => {
    if (view !== 'canvas') return
    let cancelled = false
    setDataUrl(null)
    setCanvasError(null)
    buildCanvas(baby.name, stats.totalLogs, stats.feedSessions, milestoneCount, longestStreak)
      .then((c) => { if (!cancelled) setDataUrl(c.toDataURL('image/png')) })
      .catch(() => { if (!cancelled) setCanvasError('Não foi possível gerar a imagem.') })
    return () => { cancelled = true }
  }, [view, baby.name, stats.totalLogs, stats.feedSessions, milestoneCount, longestStreak])

  // ── share ──
  const handleShare = async () => {
    if (!dataUrl || busy) return
    hapticSuccess()
    setBusy(true)
    const fileName = `yaya-2anos-${Date.now()}.png`
    try {
      if (Capacitor.isNativePlatform()) {
        const base64 = dataUrl.split(',')[1]
        const saved = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
        await Share.share({
          title: '2 Anos no Yaya!',
          text: `${baby.name} completou 2 anos de registros no Yaya Baby!`,
          url: saved.uri,
          dialogTitle: 'Compartilhar resumo',
        })
      } else if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], fileName, { type: 'image/png' })
        const shareData: ShareData = {
          title: '2 Anos no Yaya!',
          text: `${baby.name} completou 2 anos de registros no Yaya Baby!`,
          files: [file],
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((navigator as any).canShare?.(shareData)) {
          await navigator.share(shareData)
        } else {
          const a = document.createElement('a'); a.href = dataUrl; a.download = fileName; a.click()
        }
      } else {
        const a = document.createElement('a'); a.href = dataUrl; a.download = fileName; a.click()
      }
    } catch {
      // user cancelled — silently ignore
    } finally {
      setBusy(false)
    }
  }

  // ── stat cards para a UI ──
  const STAT_CARDS = [
    { emoji: '📝', value: stats.totalLogs.toLocaleString('pt-BR'), label: 'Registros no total' },
    { emoji: '🤱', value: stats.feedSessions.toLocaleString('pt-BR'), label: 'Mamadas' },
    { emoji: '💧', value: stats.diapers.toLocaleString('pt-BR'), label: 'Trocas de fralda' },
    { emoji: '🛁', value: stats.baths.toLocaleString('pt-BR'), label: 'Banhos' },
    { emoji: '🏆', value: String(milestoneCount), label: 'Marcos atingidos' },
    { emoji: '🔥', value: `${longestStreak} dias`, label: 'Maior sequência' },
  ]

  return (
    <div className="fixed inset-0 z-[70] bg-[#0d0a27] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-6 shrink-0">
        <button onClick={onClose} className="text-white/70 active:text-white p-1 -m-1">
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
        <span className="font-label text-xs uppercase tracking-wider text-white/50">
          2 Anos de Yaya 🎂
        </span>
        <div className="w-8" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mx-5 mt-4 bg-white/10 rounded-md p-1 shrink-0">
        {(['stats', 'canvas'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { hapticLight(); setView(tab) }}
            className={`flex-1 py-1.5 rounded font-label text-xs font-semibold transition-colors ${
              view === tab ? 'bg-white/20 text-white' : 'text-white/50'
            }`}
          >
            {tab === 'stats' ? 'Resumo' : 'Imagem para compartilhar'}
          </button>
        ))}
      </div>

      {/* Body — scrollável */}
      <div className="flex-1 overflow-y-auto">
        {view === 'stats' ? (
          <div className="px-5 space-y-4 pt-5 pb-8">
            {/* Cabeçalho celebratório */}
            <div className="text-center py-2">
              <div className="text-6xl mb-3">🎂</div>
              <h2 className="font-headline text-2xl font-bold text-white">
                {baby.name} completou 2 anos!
              </h2>
              <p className="font-body text-sm text-white/60 mt-1">
                Uma jornada incrível de registros dia a dia
              </p>
            </div>

            {/* Grid de estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              {STAT_CARDS.map((card) => (
                <div
                  key={card.label}
                  className="bg-white/8 border border-white/12 rounded-md px-3 py-4 text-center"
                >
                  <div className="text-2xl mb-1.5 leading-none">{card.emoji}</div>
                  <div className="font-headline text-xl font-bold text-white leading-tight">{card.value}</div>
                  <div className="font-label text-[11px] text-white/55 mt-1 leading-snug">{card.label}</div>
                </div>
              ))}
            </div>

            {/* CTA pra gerar imagem */}
            <button
              onClick={() => { hapticLight(); setView('canvas') }}
              className="w-full py-3 rounded-md font-label font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #b79fff, #ffd77a)', color: '#1a1145' }}
            >
              <span className="material-symbols-outlined text-base">photo_camera</span>
              Gerar imagem para compartilhar
            </button>
          </div>
        ) : (
          <div className="px-5 pt-5 pb-8">
            {canvasError && (
              <p className="font-label text-sm text-white/60 text-center py-12">{canvasError}</p>
            )}
            {!canvasError && !dataUrl && (
              <div className="flex justify-center py-12">
                <span className="material-symbols-outlined text-[#b79fff] text-4xl animate-spin">
                  progress_activity
                </span>
              </div>
            )}
            {dataUrl && (
              <img
                ref={imgRef}
                src={dataUrl}
                alt="Resumo 2 anos Yaya"
                className="w-full rounded-md shadow-2xl"
              />
            )}
          </div>
        )}
      </div>

      {/* Footer — botão de share só na aba canvas */}
      {view === 'canvas' && (
        <div className="px-5 pb-sheet pt-3 shrink-0 border-t border-white/10">
          <button
            disabled={!dataUrl || busy}
            onClick={handleShare}
            className="w-full py-3.5 rounded-md font-label font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #b79fff, #ffd77a)', color: '#1a1145' }}
          >
            <span className="material-symbols-outlined text-base">share</span>
            {busy ? 'Compartilhando...' : 'Compartilhar imagem'}
          </button>
        </div>
      )}
    </div>
  )
}
