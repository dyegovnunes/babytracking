/**
 * blogFilters.ts — controla filtros client-side da home e páginas de categoria.
 *
 * Recursos:
 *   - Filtro por fase do bebê (chips no hero)
 *   - Toggle de visualização (grade / lista)
 *   - Paginação (36 / 48 / todos)
 *   - Ordenação (recentes / mais vistos / mais avaliados)
 *
 * Persistência: preferências em localStorage + sincronizado em query string
 * para permitir compartilhar link com filtro aplicado.
 */

type ViewMode = 'grid' | 'list'
type SortMode = 'recent' | 'views' | 'approval'
type PageLimit = 36 | 48 | 'all'
type PhaseFilter = 'all' | 'gestante' | '0-3m' | '3-6m' | '6m+'

interface State {
  phase: PhaseFilter
  view: ViewMode
  sort: SortMode
  limit: PageLimit
}

const STORAGE_KEY = 'yb_blog_filters'

function readState(): State {
  const url = new URL(window.location.href)
  const defaults: State = { phase: 'all', view: 'grid', sort: 'recent', limit: 36 }

  // localStorage como base
  let base = defaults
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) base = { ...defaults, ...JSON.parse(raw) }
  } catch {}

  // URL sobrescreve (pra link compartilhável)
  const phase = url.searchParams.get('fase') as PhaseFilter | null
  const view = url.searchParams.get('view') as ViewMode | null
  const sort = url.searchParams.get('sort') as SortMode | null
  const limitStr = url.searchParams.get('limit')
  const limit: PageLimit | undefined =
    limitStr === 'all' ? 'all' : limitStr ? (parseInt(limitStr, 10) as PageLimit) : undefined

  return {
    phase: phase && ['all', 'gestante', '0-3m', '3-6m', '6m+'].includes(phase) ? phase : base.phase,
    view: view && ['grid', 'list'].includes(view) ? view : base.view,
    sort: sort && ['recent', 'views', 'approval'].includes(sort) ? sort : base.sort,
    limit: limit && ([36, 48, 'all'] as (number | 'all')[]).includes(limit) ? limit : base.limit,
  }
}

function saveState(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}

  // Atualiza URL sem recarregar
  const url = new URL(window.location.href)
  if (state.phase === 'all') url.searchParams.delete('fase')
  else url.searchParams.set('fase', state.phase)
  if (state.view === 'grid') url.searchParams.delete('view')
  else url.searchParams.set('view', state.view)
  if (state.sort === 'recent') url.searchParams.delete('sort')
  else url.searchParams.set('sort', state.sort)
  if (state.limit === 36) url.searchParams.delete('limit')
  else url.searchParams.set('limit', String(state.limit))

  window.history.replaceState(null, '', url.toString())
}

function applyState(state: State) {
  const root = document.getElementById('posts-root')
  if (!root) return

  const cards = Array.from(root.querySelectorAll<HTMLElement>('.post-card'))
  const countEl = document.getElementById('filter-count')

  // 1. Filtra por fase
  const matching = cards.filter((card) => {
    if (state.phase === 'all') return true
    return card.dataset.phase === state.phase
  })

  // Esconde os que não passam
  for (const card of cards) {
    const shouldShow = matching.includes(card)
    card.dataset.hiddenByFilter = shouldShow ? 'false' : 'true'
  }

  // 2. Ordena
  const sorted = [...matching].sort((a, b) => {
    if (state.sort === 'recent') {
      return (b.dataset.publishedAt ?? '').localeCompare(a.dataset.publishedAt ?? '')
    }
    if (state.sort === 'views') {
      const av = parseInt(a.dataset.views ?? '0', 10)
      const bv = parseInt(b.dataset.views ?? '0', 10)
      if (bv !== av) return bv - av
      return (b.dataset.publishedAt ?? '').localeCompare(a.dataset.publishedAt ?? '') // tiebreaker
    }
    if (state.sort === 'approval') {
      // Threshold: só ranking se tiver 3+ votos
      const at = parseInt(a.dataset.feedbackTotal ?? '0', 10)
      const bt = parseInt(b.dataset.feedbackTotal ?? '0', 10)
      const aa = at >= 3 ? parseFloat(a.dataset.feedbackApproval ?? '0') : -1
      const ba = bt >= 3 ? parseFloat(b.dataset.feedbackApproval ?? '0') : -1
      if (ba !== aa) return ba - aa
      return (b.dataset.publishedAt ?? '').localeCompare(a.dataset.publishedAt ?? '')
    }
    return 0
  })

  // Reinserir na ordem
  for (const card of sorted) {
    root.appendChild(card)
  }

  // 3. Aplica limite de paginação (esconde após o limit)
  const limitNum = state.limit === 'all' ? Infinity : state.limit
  let visibleCount = 0
  for (const card of sorted) {
    if (visibleCount < limitNum) {
      card.dataset.hiddenByLimit = 'false'
      visibleCount++
    } else {
      card.dataset.hiddenByLimit = 'true'
    }
  }
  // Cards filtrados por fase também marcam hidden-by-limit
  for (const card of cards) {
    if (card.dataset.hiddenByFilter === 'true') {
      card.dataset.hiddenByLimit = 'true'
    }
  }

  // 4. Aplica visualização (CSS mostra/esconde view-grid ou view-list em cada card)
  root.dataset.view = state.view

  // 5. Atualiza chips e selects pra refletir estado
  document.querySelectorAll<HTMLElement>('.phase-chip').forEach((el) => {
    el.dataset.active = el.dataset.phase === state.phase ? 'true' : 'false'
  })
  document.querySelectorAll<HTMLElement>('.view-btn').forEach((el) => {
    el.dataset.active = el.dataset.view === state.view ? 'true' : 'false'
  })
  const selLimit = document.getElementById('filter-limit') as HTMLSelectElement | null
  if (selLimit) selLimit.value = String(state.limit)
  const selSort = document.getElementById('filter-sort') as HTMLSelectElement | null
  if (selSort) selSort.value = state.sort

  // 6. Contagem total
  if (countEl) {
    const shown = Math.min(matching.length, limitNum)
    countEl.textContent = `${shown} de ${matching.length} ${matching.length === 1 ? 'guia' : 'guias'}`
  }
}

// Bind listeners
function init() {
  let state = readState()

  applyState(state)

  document.querySelectorAll<HTMLElement>('.phase-chip').forEach((el) => {
    el.addEventListener('click', () => {
      state = { ...state, phase: (el.dataset.phase as PhaseFilter) ?? 'all' }
      saveState(state)
      applyState(state)
    })
  })

  document.querySelectorAll<HTMLElement>('.view-btn').forEach((el) => {
    el.addEventListener('click', () => {
      state = { ...state, view: (el.dataset.view as ViewMode) ?? 'grid' }
      saveState(state)
      applyState(state)
    })
  })

  const selLimit = document.getElementById('filter-limit') as HTMLSelectElement | null
  selLimit?.addEventListener('change', () => {
    const v = selLimit.value
    state = { ...state, limit: v === 'all' ? 'all' : (parseInt(v, 10) as PageLimit) }
    saveState(state)
    applyState(state)
  })

  const selSort = document.getElementById('filter-sort') as HTMLSelectElement | null
  selSort?.addEventListener('change', () => {
    state = { ...state, sort: selSort.value as SortMode }
    saveState(state)
    applyState(state)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
