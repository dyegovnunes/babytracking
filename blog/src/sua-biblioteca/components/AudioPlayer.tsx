// AudioPlayer — player sticky no topo da seção para áudio TTS narrado.
// Busca a URL em guide_audio_segments (joinado por section_id+text_hash).
// Se ainda não existe áudio, mostra estado "carregando" mais discreto.
// Suporta velocidade 1x/1.25x/1.5x/2x e scrubber.

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  sectionId: string
  /** SHA-256 hex do conteúdo da seção (calculado pelo seed; permite cache match). */
  textHash?: string
}

const SPEEDS = [1, 1.25, 1.5, 2]

export default function AudioPlayer({ sectionId, textHash }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  // Busca audio_url no DB
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setUnavailable(false)
      let q = supabase
        .from('guide_audio_segments')
        .select('audio_url, duration_sec')
        .eq('section_id', sectionId)
      if (textHash) q = q.eq('text_hash', textHash)
      const { data } = await q.limit(1).maybeSingle()
      if (cancelled) return
      if (data?.audio_url) {
        setAudioUrl(data.audio_url)
        if (data.duration_sec) setDuration(data.duration_sec)
      } else {
        setUnavailable(true)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sectionId, textHash])

  // Atualiza speed quando muda
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx]
  }, [speedIdx])

  // Auto-pause quando seção mudar
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [sectionId])

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => { /* user gesture exigido em alguns browsers */ })
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return
    const t = parseFloat(e.target.value)
    audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const formatted = useMemo(() => {
    function fmt(s: number) {
      if (!isFinite(s)) return '0:00'
      const m = Math.floor(s / 60)
      const r = Math.floor(s % 60).toString().padStart(2, '0')
      return `${m}:${r}`
    }
    return { current: fmt(currentTime), total: fmt(duration) }
  }, [currentTime, duration])

  // Enquanto carrega ou se não há áudio gerado, não renderiza nada.
  // Isso evita o flash de "loading" em toda mudança de seção.
  if (loading || unavailable || !audioUrl) return null

  return (
    <div
      className="reader-audio-player"
      style={{
        position: 'sticky',
        top: 'var(--r-topbar-height, 56px)',
        zIndex: 5,
        margin: '0 0 1.5em',
        padding: '10px 14px',
        background: 'color-mix(in srgb, var(--r-accent) 6%, var(--r-surface))',
        border: '1px solid color-mix(in srgb, var(--r-accent) 22%, transparent)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        backdropFilter: 'blur(6px)',
      }}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = (e.currentTarget as HTMLAudioElement).duration
            if (isFinite(d) && d > 0) setDuration(d)
          }}
          onTimeUpdate={(e) => setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setCurrentTime(0) }}
        />
      )}

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        disabled={loading || !audioUrl}
        aria-label={playing ? 'Pausar' : 'Tocar narração'}
        style={{
          flex: '0 0 auto',
          width: 36, height: 36,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--r-accent)',
          color: 'var(--r-on-accent, #fff)',
          cursor: loading || !audioUrl ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: loading || !audioUrl ? 0.5 : 1,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: '"FILL" 1' }}>
          {playing ? 'pause' : 'play_arrow'}
        </span>
      </button>

      {/* Scrubber + tempo */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          disabled={loading || !audioUrl}
          style={{
            width: '100%', accentColor: 'var(--r-accent)', cursor: 'pointer',
            opacity: loading || !audioUrl ? 0.5 : 1,
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--r-text-muted)',
          fontFeatureSettings: '"tnum"',
        }}>
          <span>{formatted.current}</span>
          <span>{loading ? '…' : formatted.total}</span>
        </div>
      </div>

      {/* Speed selector */}
      <button
        onClick={() => setSpeedIdx((speedIdx + 1) % SPEEDS.length)}
        disabled={loading || !audioUrl}
        aria-label="Velocidade"
        style={{
          flex: '0 0 auto',
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px solid color-mix(in srgb, var(--r-accent) 30%, transparent)',
          background: 'transparent',
          color: 'var(--r-text)',
          fontWeight: 700, fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          cursor: loading || !audioUrl ? 'default' : 'pointer',
          opacity: loading || !audioUrl ? 0.5 : 1,
          minWidth: 50,
        }}
      >
        {SPEEDS[speedIdx]}×
      </button>
    </div>
  )
}
