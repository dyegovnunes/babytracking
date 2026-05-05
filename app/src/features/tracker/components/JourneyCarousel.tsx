// JourneyCarousel — substitui HighlightsStrip + ContentArticleCard na TrackerPage.
//
// Sequência fixa de até 6 slides:
//   blog_top1 → vacina → blog_random_a → marco → blog_random_b → salto
//
// Ambos os tipos de card têm a mesma estrutura: imagem 16:9 no topo + bloco de
// texto fixo abaixo — garantindo altura constante ao trocar de slide.
// Cards de feature exibem a imagem real (marcos/saltos/vacinas) + badge overlay.
//
// Animação de transição CSS translateX; drag ao vivo via manipulação direta do DOM.
// Barra de progresso fina abaixo do card indica tempo até o próximo auto-avanço.

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { hapticLight } from '../../../lib/haptics'
import type { Highlight } from '../highlights'
import type { ContentArticle, ContentCategory } from '../../content/contentTypes'
import { CONTENT_CATEGORY_EMOJI } from '../../content/contentTypes'
import HighlightSheet from './HighlightSheet'

// ---------- Types ----------

type BlogItem    = { kind: 'blog';    article:   ContentArticle }
type FeatureItem = { kind: 'feature'; highlight: Highlight }
type CarouselItem = BlogItem | FeatureItem

// ---------- Constants ----------

const AUTO_ADVANCE_MS  = 5000
const RESUME_IDLE_MS   = 2500
const SWIPE_THRESHOLD  = 48
const MAX_DOTS         = 8

// ---------- Image mapping ----------

function getFeatureImageUrl(h: Highlight): string | null {
  if (h.data.type === 'leap_active' || h.data.type === 'leap_upcoming') {
    const id = h.data.leap.id
    return `/carousel/saltos/salto-${id}.jpg`
  }
  if (h.data.type === 'milestone') {
    const MAP: Record<string, string> = {
      motor:       'marco-motor-grosso',
      motor_fino:  'marco-motor-fino',
      cognitivo:   'marco-cognitivo',
      social:      'marco-social',
      linguagem:   'marco-linguagem',
      comunicacao: 'marco-linguagem',
      alimentacao: 'marco-alimentacao',
      autonomia:   'marco-autonomia',
    }
    const name = MAP[h.data.milestone.category] ?? 'marco-cognitivo'
    return `/carousel/marcos/${name}.jpg`
  }
  if (h.data.type === 'vaccine_overdue' || h.data.type === 'vaccine_upcoming') {
    const days = h.data.vaccine.recommendedAgeDays
    let file: string
    if (days < 46)       file = 'vacina-recem-nascido'
    else if (days < 91)  file = 'vacina-2-meses'
    else if (days < 361) file = 'vacina-4-6-meses'
    else if (days < 451) file = 'vacina-12-15-meses'
    else                 file = 'vacina-15-24-meses'
    return `/carousel/vacinas/${file}.jpg`
  }
  return null
}

// ---------- Accent maps ----------

const ACCENT_GRADIENT: Record<Highlight['accent'], string> = {
  primary:  'linear-gradient(145deg, rgba(183,159,255,0.22) 0%, rgba(183,159,255,0.07) 100%)',
  tertiary: 'linear-gradient(145deg, rgba(255,150,185,0.22) 0%, rgba(255,150,185,0.07) 100%)',
  warning:  'linear-gradient(145deg, rgba(234,179,8,0.22)   0%, rgba(234,179,8,0.07)   100%)',
  success:  'linear-gradient(145deg, rgba(34,197,94,0.22)   0%, rgba(34,197,94,0.07)   100%)',
}

const ACCENT_BADGE: Record<Highlight['accent'], string> = {
  primary:  'rgba(100, 60, 200, 0.78)',
  tertiary: 'rgba(190, 50, 110, 0.78)',
  warning:  'rgba(140,  95,   0, 0.82)',
  success:  'rgba(  5, 120,  50, 0.82)',
}

const ACCENT_KICKER: Record<Highlight['accent'], string> = {
  primary:  'text-primary',
  tertiary: 'text-tertiary',
  warning:  'text-yellow-400',
  success:  'text-green-400',
}

const ACCENT_BTN: Record<Highlight['accent'], string> = {
  primary:  'bg-primary/15 text-primary',
  tertiary: 'bg-tertiary/15 text-tertiary',
  warning:  'bg-yellow-500/15 text-yellow-400',
  success:  'bg-green-500/15 text-green-400',
}

// ---------- Blog kicker personalizado por categoria ----------

const BLOG_KICKER_LABEL: Record<ContentCategory, string> = {
  alimentacao:     'Dica de alimentação',
  amamentacao:     'Dica de amamentação',
  sono:            'Dica de sono',
  desenvolvimento: 'Desenvolvimento',
  saude:           'Para a saúde do bebê',
  rotina:          'Dica de rotina',
  marcos:          'Para não perder',
  gestacao:        'Gestação',
  seguranca:       'Segurança do bebê',
}

// ---------- Texto personalizado para cada tipo de feature ----------
//
// Sobrescreve o kicker/title genéricos do highlights.ts com copy
// específico para o contexto do carrossel — mais direto e com nome do bebê.

interface CarouselFeatureText {
  /** Texto curto exibido no badge overlay da imagem (ex: "7 chegando") */
  badge: string
  /** Label da categoria no bloco de texto */
  kicker: string
  /** Título principal — personalizado com o nome do bebê */
  title: string
}

function getCarouselFeatureText(h: Highlight, babyName: string): CarouselFeatureText {
  const d = h.data

  if (d.type === 'vaccine_upcoming') {
    const total = 1 + d.othersCount
    const countLabel = total === 1 ? '1 chegando' : `${total} chegando`
    return {
      badge:  countLabel,
      kicker: 'Próximas vacinas',
      title:  total === 1
        ? `${d.vaccine.shortName} está chegando para ${babyName}`
        : `${babyName} tem ${total} vacinas chegando`,
    }
  }

  if (d.type === 'vaccine_overdue') {
    const total = 1 + d.othersCount
    const countLabel = total === 1 ? '1 em atraso' : `${total} em atraso`
    return {
      badge:  countLabel,
      kicker: 'Vacinas pendentes',
      title:  total === 1
        ? `${babyName} está com ${d.vaccine.shortName} em atraso`
        : `${babyName} tem ${total} vacinas em atraso`,
    }
  }

  if (d.type === 'milestone') {
    return {
      badge:  'Próximo marco',
      kicker: 'Marco de desenvolvimento',
      title:  `${babyName} está perto de: ${d.milestone.name}`,
    }
  }

  if (d.type === 'leap_active') {
    return {
      badge:  `Salto ${d.leap.id} — ativo`,
      kicker: 'Salto mental em andamento',
      title:  `${babyName} está no Salto ${d.leap.id}: ${d.leap.name}`,
    }
  }

  if (d.type === 'leap_upcoming') {
    const weeks = d.weeksUntil
    return {
      badge:  `Em ${weeks} semana${weeks !== 1 ? 's' : ''}`,
      kicker: 'Próximo salto mental',
      title:  `O Salto ${d.leap.id} está chegando para ${babyName}`,
    }
  }

  // Fallback genérico
  return { badge: h.kicker, kicker: h.kicker, title: h.title }
}

// ---------- Sequence builder ----------

/**
 * Ordem fixa: blog_top1 → vacina → blog_a → marco → blog_b → salto
 * - Feature slots: só incluídos se o highlight estiver ativo
 * - Blog slots intermediários: só incluídos se há artigos E se pelo menos
 *   uma feature no lado direito da sequência está ativa
 */
function buildSequence(
  highlights: Highlight[],
  articles: ContentArticle[],
  randomBlogsRef: React.MutableRefObject<[ContentArticle | null, ContentArticle | null]>,
): CarouselItem[] {
  const vacina = highlights.find((h) =>
    h.type === 'vaccine_overdue' || h.type === 'vaccine_upcoming',
  )
  const marco = highlights.find((h) => h.type === 'milestone')
  const salto = highlights.find((h) =>
    h.type === 'leap_active' || h.type === 'leap_upcoming',
  )

  const top1           = articles[0] ?? null
  const [randA, randB] = randomBlogsRef.current

  const items: CarouselItem[] = []

  if (top1) items.push({ kind: 'blog', article: top1 })
  if (vacina) items.push({ kind: 'feature', highlight: vacina })
  if (randA && (marco || salto)) items.push({ kind: 'blog', article: randA })
  if (marco) items.push({ kind: 'feature', highlight: marco })
  if (randB && salto) items.push({ kind: 'blog', article: randB })
  if (salto) items.push({ kind: 'feature', highlight: salto })

  // Se nenhuma feature está ativa e há artigos, mostra só os artigos
  const hasFeature = items.some((i) => i.kind === 'feature')
  if (!hasFeature && articles.length > 0) {
    return articles.slice(0, 3).map((a) => ({ kind: 'blog', article: a }))
  }

  return items
}

// ---------- Track helpers ----------

function applySlideTransform(
  el: HTMLDivElement,
  index: number,
  n: number,
  offset: number,
  animated: boolean,
) {
  el.style.transition = animated
    ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : 'none'
  el.style.transform = n > 0
    ? `translateX(calc(${-(index / n) * 100}% + ${offset}px))`
    : 'translateX(0)'
}

// ---------- Props ----------

interface Props {
  highlights:       Highlight[]
  articles:         ContentArticle[]
  babyName:         string
  babyGender?:      'boy' | 'girl'
  birthDate:        string
  onChange:         () => void
  onDismissArticle: (slug: string) => void
}

// ---------- Component ----------

export default function JourneyCarousel({
  highlights,
  articles,
  babyName,
  babyGender,
  birthDate,
  onChange,
  onDismissArticle,
}: Props) {
  const [index,         setIndex]         = useState(0)
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)
  const [isPaused,      setIsPaused]      = useState(false)
  const isPausedRef = useRef(false)

  // Stable random articles — only reshuffles when article IDs change
  const prevArticleIdsRef = useRef('')
  const randomBlogsRef    = useRef<[ContentArticle | null, ContentArticle | null]>([null, null])

  const articleIds = articles.map((a) => a.id).join(',')
  if (articleIds !== prevArticleIdsRef.current) {
    prevArticleIdsRef.current = articleIds
    const pool = [...articles.slice(1)].sort(() => Math.random() - 0.5)
    randomBlogsRef.current = [pool[0] ?? null, pool[1] ?? null]
  }

  const items = useMemo(
    () => buildSequence(highlights, articles, randomBlogsRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [highlights, articleIds],
  )

  // Keep index in bounds if items shrink
  useEffect(() => {
    if (items.length > 0 && index >= items.length) {
      setIndex(items.length - 1)
    }
  }, [items.length, index])

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const trackRef       = useRef<HTMLDivElement>(null)
  const progressRef    = useRef<HTMLDivElement>(null)
  const indexRef       = useRef(0)
  indexRef.current = index
  const itemsLenRef    = useRef(0)
  itemsLenRef.current = items.length
  const openHighlightRef = useRef<Highlight | null>(null)
  openHighlightRef.current = openHighlight

  // ── Progress bar ──────────────────────────────────────────────────────────

  const startProgressBar = useCallback(() => {
    const el = progressRef.current
    if (!el) return
    el.style.animation = 'none'
    void el.offsetHeight            // force reflow to restart animation
    el.style.animation = `carousel-progress ${AUTO_ADVANCE_MS}ms linear forwards`
  }, [])

  const pauseProgressBar = useCallback(() => {
    const el = progressRef.current
    if (!el) return
    el.style.animationPlayState = 'paused'
  }, [])

  // ── Slide transform ───────────────────────────────────────────────────────

  // Called after React commits the new index
  useEffect(() => {
    const el = trackRef.current
    if (el) applySlideTransform(el, index, items.length, 0, true)
    if (!isPausedRef.current) startProgressBar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length])

  // ── Auto-advance ──────────────────────────────────────────────────────────

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  const clearAutoAdvance = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startAutoAdvance = useCallback(() => {
    clearAutoAdvance()
    if (itemsLenRef.current <= 1) return
    timerRef.current = setInterval(() => {
      if (!openHighlightRef.current) {
        setIndex((prev) => (prev + 1) % itemsLenRef.current)
        // Progress bar resets via useEffect → startProgressBar()
      }
    }, AUTO_ADVANCE_MS)
  }, [clearAutoAdvance])

  useEffect(() => {
    startAutoAdvance()
    return clearAutoAdvance
  }, [startAutoAdvance, clearAutoAdvance])

  // ── Touch / swipe ─────────────────────────────────────────────────────────

  const dragStartXRef   = useRef<number | null>(null)
  const dragStartYRef   = useRef<number | null>(null)
  const isHorizDragRef  = useRef(false)

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        startAutoAdvance()
        startProgressBar()
      }
    }, RESUME_IDLE_MS)
  }, [startAutoAdvance, startProgressBar])

  const togglePause = useCallback(() => {
    if (isPausedRef.current) {
      isPausedRef.current = false
      setIsPaused(false)
      startAutoAdvance()
      startProgressBar()
    } else {
      isPausedRef.current = true
      setIsPaused(true)
      clearAutoAdvance()
      pauseProgressBar()
    }
  }, [startAutoAdvance, startProgressBar, clearAutoAdvance, pauseProgressBar])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    clearAutoAdvance()
    pauseProgressBar()
    dragStartXRef.current  = e.touches[0].clientX
    dragStartYRef.current  = e.touches[0].clientY
    isHorizDragRef.current = false
  }, [clearAutoAdvance, pauseProgressBar])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartXRef.current === null) return
    const dx = e.touches[0].clientX - dragStartXRef.current
    const dy = e.touches[0].clientY - dragStartYRef.current!

    if (!isHorizDragRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return // intent unclear
      if (Math.abs(dx) > Math.abs(dy)) {
        isHorizDragRef.current = true
      } else {
        // Vertical scroll — cancel drag
        dragStartXRef.current = null
        dragStartYRef.current = null
        return
      }
    }

    // Apply live drag offset directly on the DOM (no React re-render)
    const el = trackRef.current
    if (el) applySlideTransform(el, indexRef.current, itemsLenRef.current, dx, false)
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const sx = dragStartXRef.current
    const el = trackRef.current

    if (sx !== null && isHorizDragRef.current && el) {
      const dx = e.changedTouches[0].clientX - sx
      const n  = itemsLenRef.current

      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        hapticLight()
        const newIndex = dx < 0
          ? (indexRef.current + 1) % n
          : (indexRef.current - 1 + n) % n
        // Apply immediately via DOM so the snap feels instant
        indexRef.current = newIndex
        applySlideTransform(el, newIndex, n, 0, true)
        setIndex(newIndex)
        // useEffect will fire again and re-apply (same result, harmless)
      } else {
        // Snap back
        applySlideTransform(el, indexRef.current, n, 0, true)
      }
    }

    dragStartXRef.current  = null
    dragStartYRef.current  = null
    isHorizDragRef.current = false
    scheduleResume()
  }, [scheduleResume])

  const goToDot = useCallback((i: number) => {
    hapticLight()
    clearAutoAdvance()
    setIndex(i)
    scheduleResume()
  }, [clearAutoAdvance, scheduleResume])

  // ─────────────────────────────────────────────────────────────────────────

  if (items.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes carousel-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      <section className="mt-6">
        {/* Cabeçalho */}
        <div className="px-5 mb-3">
          <h2 className="font-headline text-base font-bold text-on-surface">
            Acompanhe a jornada {babyGender === 'girl' ? 'da' : 'do'} {babyName}
          </h2>
        </div>

        {/* Slider */}
        <div className="px-5">
          <div
            className="overflow-hidden rounded-md"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Track */}
            <div
              ref={trackRef}
              style={{ display: 'flex', width: `${items.length * 100}%` }}
            >
              {items.map((item, i) => (
                <div
                  key={`${item.kind}-${item.kind === 'blog' ? item.article.id : item.highlight.id}-${i}`}
                  style={{ width: `${100 / items.length}%`, flexShrink: 0 }}
                >
                  {item.kind === 'blog' ? (
                    <BlogCard
                      article={item.article}
                      onDismiss={() => {
                        onDismissArticle(item.article.slug)
                        onChange()
                      }}
                    />
                  ) : (
                    <FeatureCard
                      highlight={item.highlight}
                      imageUrl={getFeatureImageUrl(item.highlight)}
                      babyName={babyName}
                      onTap={() => {
                        hapticLight()
                        setOpenHighlight(item.highlight)
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {items.length > 1 && (
            <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', marginTop: 8, borderRadius: 1 }}>
              <div
                ref={progressRef}
                style={{
                  height: '100%',
                  background: 'rgba(183,159,255,0.55)',
                  borderRadius: 1,
                  transformOrigin: 'left',
                  animation: `carousel-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
                }}
              />
            </div>
          )}
        </div>

        {/* Dots + botão pausar */}
        {items.length > 1 && (
          <div className="flex items-center px-5 mt-2.5 pb-1">
            {/* Spacer para centralizar os dots */}
            <div style={{ width: 28 }} />

            <div className="flex-1 flex justify-center">
              <DotsIndicator
                total={items.length}
                active={index}
                onDotClick={goToDot}
              />
            </div>

            {/* Pause / Play */}
            <button
              type="button"
              aria-label={isPaused ? 'Retomar' : 'Pausar'}
              onClick={togglePause}
              className="flex items-center justify-center"
              style={{ width: 28, height: 28 }}
            >
              <span
                className="material-symbols-outlined text-on-surface/35"
                style={{ fontSize: 18 }}
              >
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
          </div>
        )}
      </section>

      {openHighlight && (
        <HighlightSheet
          highlight={openHighlight}
          babyName={babyName}
          babyGender={babyGender}
          birthDate={birthDate}
          onClose={() => setOpenHighlight(null)}
          onDismissed={() => { setOpenHighlight(null); onChange() }}
          onNavigated={() => { setOpenHighlight(null); onChange() }}
        />
      )}
    </>
  )
}

// ---------- Shared card shell ----------
// Imagem 16:9 no topo + bloco de texto abaixo com altura fixa — garante que
// ambos os tipos de card (blog e feature) tenham sempre a mesma altura total.

function CardShell({
  imageUrl,
  imageFallback,
  imageOverlay,
  imageTopRight,
  borderColor,
  children,
  onClick,
  ariaLabel,
}: {
  imageUrl:      string | null
  imageFallback: React.ReactNode
  imageOverlay?: React.ReactNode
  imageTopRight?: React.ReactNode
  borderColor:   string
  children:      React.ReactNode
  onClick:       () => void
  ariaLabel:     string
}) {
  return (
    <button
      type="button"
      className="w-full text-left active:scale-[0.98] transition-transform"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <div
        className="rounded-md overflow-hidden"
        style={{ border: `1px solid ${borderColor}` }}
      >
        {/* Imagem 16:9 */}
        <div
          className="relative w-full"
          style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              aria-hidden
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              aria-hidden
            >
              {imageFallback}
            </div>
          )}

          {/* Gradient overlay bottom */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(15,11,26,0.60) 100%)' }}
          />

          {/* Overlay conteúdo extra (badge de feature, botão X de blog) */}
          {imageOverlay}
          {imageTopRight}
        </div>

        {/* Bloco de texto — altura fixa */}
        <div style={{ minHeight: 88 }}>
          {children}
        </div>
      </div>
    </button>
  )
}

// ---------- BlogCard ----------

async function openUrl(url: string) {
  hapticLight()
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function BlogCard({
  article,
  onDismiss,
}: {
  article:   ContentArticle
  onDismiss: () => void
}) {
  const emoji = CONTENT_CATEGORY_EMOJI[article.category] ?? '📖'

  return (
    <CardShell
      imageUrl={article.imageUrl}
      imageFallback={
        <span style={{ fontSize: 40 }}>{emoji}</span>
      }
      imageTopRight={
        <button
          type="button"
          aria-label="Dispensar sugestão"
          className="absolute top-2 right-2 flex items-center justify-center rounded-full text-white/80"
          style={{ background: 'rgba(0,0,0,0.45)', width: 28, height: 28, backdropFilter: 'blur(4px)' }}
          onClick={(e) => { e.stopPropagation(); hapticLight(); onDismiss() }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      }
      borderColor="rgba(183,159,255,0.12)"
      onClick={() => openUrl(article.blogUrl)}
      ariaLabel={`Abrir artigo: ${article.title}`}
    >
      <div className="px-3 pt-2.5 pb-3">
        <p className="font-label text-[10px] uppercase tracking-wider text-primary/70 font-bold mb-1">
          {emoji} {BLOG_KICKER_LABEL[article.category] ?? 'Selecionado para você'}
        </p>
        <p
          className="font-label text-sm font-semibold text-on-surface leading-snug mb-2"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {article.title}
        </p>
        <p className="font-label text-xs text-primary font-medium">Ler artigo →</p>
      </div>
    </CardShell>
  )
}

// ---------- FeatureCard ----------

function FeatureCard({
  highlight,
  imageUrl,
  babyName,
  onTap,
}: {
  highlight: Highlight
  imageUrl:  string | null
  babyName:  string
  onTap:     () => void
}) {
  const hasBg = Boolean(imageUrl)
  const ct    = getCarouselFeatureText(highlight, babyName)

  return (
    <CardShell
      imageUrl={imageUrl}
      imageFallback={
        // Fallback: gradiente de accent + emoji grande centralizado
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: ACCENT_GRADIENT[highlight.accent] }}
        >
          <span style={{ fontSize: 52 }} aria-hidden>{highlight.emoji}</span>
        </div>
      }
      imageOverlay={
        // Badge personalizado no canto inferior-esquerdo da imagem
        <div
          className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded"
          style={{
            background: hasBg ? ACCENT_BADGE[highlight.accent] : 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ fontSize: 12 }} aria-hidden>{highlight.emoji}</span>
          <span
            className="font-label font-bold text-white"
            style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            {ct.badge}
          </span>
        </div>
      }
      borderColor="rgba(183,159,255,0.10)"
      onClick={onTap}
      ariaLabel={`${ct.kicker}: ${ct.title}`}
    >
      <div className="px-3 pt-2.5 pb-3">
        <p className={`font-label text-[10px] font-bold uppercase tracking-wider mb-1 ${ACCENT_KICKER[highlight.accent]}`}>
          {ct.kicker}
        </p>
        <p
          className="font-headline text-sm font-bold text-on-surface leading-snug mb-2"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ct.title}
        </p>
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-label text-xs font-semibold ${ACCENT_BTN[highlight.accent]}`}>
          Ver mais →
        </div>
      </div>
    </CardShell>
  )
}

// ---------- DotsIndicator ----------

function DotsIndicator({
  total,
  active,
  onDotClick,
}: {
  total:      number
  active:     number
  onDotClick: (i: number) => void
}) {
  const windowStart = Math.max(0, Math.min(active - Math.floor(MAX_DOTS / 2), total - MAX_DOTS))
  const windowEnd   = Math.min(total, windowStart + MAX_DOTS)
  const visible     = Array.from({ length: windowEnd - windowStart }, (_, i) => windowStart + i)

  return (
    <div className="flex items-center justify-center gap-1.5">
      {visible.map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`Ir para item ${i + 1}`}
          onClick={() => onDotClick(i)}
          className={`rounded-full transition-all duration-200 ${
            i === active
              ? 'bg-primary w-4 h-1.5'
              : 'bg-on-surface/20 w-1.5 h-1.5'
          }`}
        />
      ))}
    </div>
  )
}
