// JourneyCarousel — substitui HighlightsStrip + ContentArticleCard na TrackerPage.
//
// Sequência fixa de até 6 slides:
//   blog_top1 → vacina → blog_random_a → marco → blog_random_b → salto
//
// Slots de feature só aparecem se estiverem ativos para o bebê.
// Slots de blog só aparecem se houver artigos disponíveis.
// Auto-avança a cada 3s; swipe pausa e retoma após 2.5s ocioso.
// Dots indicadores abaixo do card (máx 8 visíveis, janela deslizante).
//
// Quando imagens de feature estiverem prontas (marcos, saltos, vacinas),
// basta adicionar um mapa de imageUrl por ID em featureImages.ts e
// passar imageUrl para FeatureCard — a estrutura já está preparada.

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { hapticLight } from '../../../lib/haptics'
import { track } from '../../../lib/analytics'
import type { Highlight } from '../highlights'
import type { ContentArticle } from '../../content/contentTypes'
import { CONTENT_CATEGORY_EMOJI } from '../../content/contentTypes'
import HighlightSheet from './HighlightSheet'

// ---------- Types ----------

type BlogItem    = { kind: 'blog';    article:   ContentArticle }
type FeatureItem = { kind: 'feature'; highlight: Highlight }
type CarouselItem = BlogItem | FeatureItem

// ---------- Constants ----------

const AUTO_ADVANCE_MS  = 3000
const RESUME_IDLE_MS   = 2500
const SWIPE_THRESHOLD  = 50
const MAX_DOTS         = 8

// ---------- Accent maps ----------

const ACCENT_GRADIENT: Record<Highlight['accent'], string> = {
  primary:  'linear-gradient(145deg, rgba(183,159,255,0.22) 0%, rgba(183,159,255,0.07) 100%)',
  tertiary: 'linear-gradient(145deg, rgba(255,150,185,0.22) 0%, rgba(255,150,185,0.07) 100%)',
  warning:  'linear-gradient(145deg, rgba(234,179,8,0.22)   0%, rgba(234,179,8,0.07)   100%)',
  success:  'linear-gradient(145deg, rgba(34,197,94,0.22)   0%, rgba(34,197,94,0.07)   100%)',
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

const ACCENT_BORDER: Record<Highlight['accent'], string> = {
  primary:  'rgba(183,159,255,0.2)',
  tertiary: 'rgba(255,150,185,0.2)',
  warning:  'rgba(234,179,8,0.2)',
  success:  'rgba(34,197,94,0.2)',
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
  const FEATURE_TYPES = new Set([
    'milestone',
    'leap_active',
    'leap_upcoming',
    'vaccine_overdue',
    'vaccine_upcoming',
  ] as const)

  const vacina = highlights.find((h) =>
    h.type === 'vaccine_overdue' || h.type === 'vaccine_upcoming',
  )
  const marco = highlights.find((h) => h.type === 'milestone')
  const salto = highlights.find((h) =>
    h.type === 'leap_active' || h.type === 'leap_upcoming',
  )

  const top1  = articles[0] ?? null
  const [randA, randB] = randomBlogsRef.current

  const items: CarouselItem[] = []

  // 1. Blog top 1
  if (top1) items.push({ kind: 'blog', article: top1 })

  // 2. Vacina
  if (vacina) items.push({ kind: 'feature', highlight: vacina })

  // 3. Blog random A — apenas se há feature depois (marco ou salto)
  if (randA && (marco || salto)) items.push({ kind: 'blog', article: randA })

  // 4. Marco
  if (marco) items.push({ kind: 'feature', highlight: marco })

  // 5. Blog random B — apenas se salto está ativo
  if (randB && salto) items.push({ kind: 'blog', article: randB })

  // 6. Salto
  if (salto) items.push({ kind: 'feature', highlight: salto })

  // Se nenhuma feature está ativa e há artigos, mostra só os artigos
  const hasFeature = items.some((i) => i.kind === 'feature')
  if (!hasFeature && articles.length > 0) {
    return articles.slice(0, 3).map((a) => ({ kind: 'blog', article: a }))
  }

  // Caso não haja nada relevante
  const usedTypes = highlights.filter((h) => FEATURE_TYPES.has(h.type as never))
  if (items.length === 0 && usedTypes.length === 0) return []

  return items
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

  // Estabiliza artigos aleatórios: só recalcula quando a lista de artigos muda
  const prevArticleIdsRef = useRef('')
  const randomBlogsRef    = useRef<[ContentArticle | null, ContentArticle | null]>([null, null])

  const articleIds = articles.map((a) => a.id).join(',')
  if (articleIds !== prevArticleIdsRef.current) {
    prevArticleIdsRef.current = articleIds
    // Embaralha posições 1..N e pega as 2 primeiras
    const pool = [...articles.slice(1)].sort(() => Math.random() - 0.5)
    randomBlogsRef.current = [pool[0] ?? null, pool[1] ?? null]
  }

  const items = useMemo(
    () => buildSequence(highlights, articles, randomBlogsRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [highlights, articleIds],
  )

  // Clamp index quando items encolhe (ex: artigo dispensado)
  useEffect(() => {
    if (items.length > 0 && index >= items.length) {
      setIndex(items.length - 1)
    }
  }, [items.length, index])

  // ── Auto-advance ──────────────────────────────────────────────────────────

  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openHighlightRef = useRef<Highlight | null>(null)
  openHighlightRef.current = openHighlight

  const clearAutoAdvance = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startAutoAdvance = useCallback(() => {
    clearAutoAdvance()
    if (items.length <= 1) return
    timerRef.current = setInterval(() => {
      if (!openHighlightRef.current) {
        setIndex((prev) => (prev + 1) % items.length)
      }
    }, AUTO_ADVANCE_MS)
  }, [items.length, clearAutoAdvance])

  useEffect(() => {
    startAutoAdvance()
    return clearAutoAdvance
  }, [startAutoAdvance, clearAutoAdvance])

  // ── Swipe ─────────────────────────────────────────────────────────────────

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    clearAutoAdvance()
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [clearAutoAdvance])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const sx = touchStartX.current
    const sy = touchStartY.current
    if (sx !== null && sy !== null) {
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        hapticLight()
        setIndex((prev) =>
          dx < 0
            ? (prev + 1) % items.length
            : (prev - 1 + items.length) % items.length,
        )
      }
    }
    touchStartX.current = null
    touchStartY.current = null
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(startAutoAdvance, RESUME_IDLE_MS)
  }, [items.length, startAutoAdvance])

  if (items.length === 0) return null

  const current = items[index]

  return (
    <>
      <section className="mt-6">
        {/* Cabeçalho */}
        <div className="px-5 mb-3">
          <h2 className="font-headline text-base font-bold text-on-surface">
            Acompanhe a jornada {babyGender === 'girl' ? 'da' : 'do'} {babyName}
          </h2>
        </div>

        {/* Card com suporte a swipe */}
        <div
          className="px-5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {current.kind === 'blog' ? (
            <BlogCard
              article={current.article}
              onDismiss={() => {
                onDismissArticle(current.article.slug)
                onChange()
              }}
            />
          ) : (
            <FeatureCard
              highlight={current.highlight}
              onTap={() => {
                hapticLight()
                setOpenHighlight(current.highlight)
              }}
            />
          )}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <DotsIndicator
            total={items.length}
            active={index}
            onDotClick={(i) => {
              hapticLight()
              clearAutoAdvance()
              setIndex(i)
              if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
              resumeTimerRef.current = setTimeout(startAutoAdvance, RESUME_IDLE_MS)
            }}
          />
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

// ---------- BlogCard ----------

async function openUrl(url: string, slug: string) {
  hapticLight()
  track('blog_article_opened', { article_slug: slug, source: 'journey_carousel' })
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
    <button
      type="button"
      className="w-full text-left active:scale-[0.98] transition-transform"
      onClick={() => openUrl(article.blogUrl, article.slug)}
      aria-label={`Abrir artigo: ${article.title}`}
    >
      <div
        className="rounded-md overflow-hidden"
        style={{ background: 'rgba(183,159,255,0.05)', border: '1px solid rgba(183,159,255,0.12)' }}
      >
        {/* Imagem 16:9 */}
        <div
          className="relative w-full"
          style={{ aspectRatio: '16/9', background: 'rgba(183,159,255,0.1)' }}
        >
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt=""
              aria-hidden
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ fontSize: 36 }} aria-hidden>
              {emoji}
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(15,11,26,0.55) 100%)' }}
          />

          {/* Botão fechar */}
          <button
            type="button"
            aria-label="Dispensar sugestão"
            className="absolute top-2 right-2 flex items-center justify-center rounded-full text-white/80"
            style={{ background: 'rgba(0,0,0,0.45)', width: 28, height: 28, backdropFilter: 'blur(4px)' }}
            onClick={(e) => { e.stopPropagation(); hapticLight(); onDismiss() }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Texto */}
        <div className="px-3 py-2.5">
          <p className="font-label text-[10px] uppercase tracking-wider text-primary/70 font-bold mb-1">
            {emoji} Para você
          </p>
          <p
            className="font-label text-sm font-semibold text-on-surface leading-snug mb-1.5"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {article.title}
          </p>
          <p className="font-label text-xs text-primary font-medium">Ler artigo →</p>
        </div>
      </div>
    </button>
  )
}

// ---------- FeatureCard ----------
// TODO: adicionar imageUrl quando imagens de saltos/marcos/vacinas estiverem prontas.
// Estrutura já suporta: basta passar `imageUrl?: string` e renderizar o <img> no topo.

function FeatureCard({
  highlight,
  onTap,
}: {
  highlight: Highlight
  onTap:     () => void
}) {
  return (
    <button
      type="button"
      className="w-full text-left active:scale-[0.98] transition-transform"
      onClick={onTap}
      aria-label={`${highlight.kicker}: ${highlight.title}`}
    >
      <div
        className="rounded-md overflow-hidden"
        style={{
          background: ACCENT_GRADIENT[highlight.accent],
          border: `1px solid ${ACCENT_BORDER[highlight.accent]}`,
          minHeight: 160,
        }}
      >
        {/* Emoji centralizado */}
        <div className="flex items-center justify-center pt-7 pb-4">
          <span style={{ fontSize: 56 }} aria-hidden>{highlight.emoji}</span>
        </div>

        {/* Texto */}
        <div className="px-4 pb-4">
          <p className={`font-label text-[10px] font-bold uppercase tracking-wider mb-1 ${ACCENT_KICKER[highlight.accent]}`}>
            {highlight.kicker}
          </p>
          <p
            className="font-headline text-base font-bold text-on-surface leading-snug mb-3"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {highlight.title}
          </p>
          <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-label text-xs font-semibold ${ACCENT_BTN[highlight.accent]}`}>
            Ver mais →
          </div>
        </div>
      </div>
    </button>
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
    <div className="flex items-center justify-center gap-1.5 mt-3 pb-1">
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
