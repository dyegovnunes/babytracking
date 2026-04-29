// useReadingProgress — auto-save do progresso de leitura por seção.
// Salva scroll_offset + last_seen_at periodicamente; marca completed quando
// usuário rola até o final OU clica explicitamente em "Marcar como concluída".

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

interface UseReadingProgressOptions {
  userId: string | null
  guideId: string | null
  sectionId: string | null
  containerRef: React.RefObject<HTMLElement | null>
}

const SAVE_DEBOUNCE_MS = 1500

export function useReadingProgress({ userId, guideId, sectionId, containerRef }: UseReadingProgressOptions) {
  const saveTimer = useRef<number | null>(null)
  const lastSavedOffset = useRef<number>(0)

  // Salva scroll_offset com debounce
  const queueSave = useCallback((offset: number) => {
    if (!userId || !guideId || !sectionId) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      // Só salva se mudou ≥30px (evita writes desnecessários)
      if (Math.abs(offset - lastSavedOffset.current) < 30) return
      lastSavedOffset.current = offset
      await supabase.from('guide_progress').upsert({
        user_id: userId,
        guide_id: guideId,
        section_id: sectionId,
        scroll_offset: Math.round(offset),
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'user_id,section_id' })
    }, SAVE_DEBOUNCE_MS)
  }, [userId, guideId, sectionId])

  // Resume reading: ao montar, busca scroll_offset salvo e rola pra ele
  useEffect(() => {
    if (!userId || !sectionId || !containerRef.current) return
    let cancelled = false
    async function restore() {
      const { data } = await supabase
        .from('guide_progress')
        .select('scroll_offset')
        .eq('user_id', userId)
        .eq('section_id', sectionId)
        .single()
      if (cancelled) return
      if (data?.scroll_offset && data.scroll_offset > 100) {
        // Smooth scroll pra última posição com pequeno delay (espera layout)
        setTimeout(() => {
          window.scrollTo({ top: data.scroll_offset!, behavior: 'smooth' })
          lastSavedOffset.current = data.scroll_offset!
        }, 200)
      }
    }
    restore()
    return () => { cancelled = true }
  }, [userId, sectionId])

  // Listen scroll
  useEffect(() => {
    function onScroll() {
      queueSave(window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [queueSave])

  // Save on unload (best-effort)
  useEffect(() => {
    function onBeforeUnload() {
      if (!userId || !guideId || !sectionId) return
      const offset = Math.round(window.scrollY)
      // sendBeacon é mais confiável em unload do que fetch normal
      const payload = JSON.stringify({
        user_id: userId, guide_id: guideId, section_id: sectionId,
        scroll_offset: offset, last_seen_at: new Date().toISOString(),
      })
      // Não temos endpoint custom de beacon; tenta upsert async (best-effort)
      try {
        supabase.from('guide_progress').upsert(JSON.parse(payload), { onConflict: 'user_id,section_id' })
      } catch { /* swallow */ }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [userId, guideId, sectionId])

  // Marca como concluída
  const markCompleted = useCallback(async () => {
    if (!userId || !guideId || !sectionId) return
    await supabase.from('guide_progress').upsert({
      user_id: userId,
      guide_id: guideId,
      section_id: sectionId,
      completed: true,
      completed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,section_id' })
  }, [userId, guideId, sectionId])

  // Desmarca como concluída
  const markUncompleted = useCallback(async () => {
    if (!userId || !guideId || !sectionId) return
    await supabase.from('guide_progress').upsert({
      user_id: userId,
      guide_id: guideId,
      section_id: sectionId,
      completed: false,
      completed_at: null,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,section_id' })
  }, [userId, guideId, sectionId])

  return { markCompleted, markUncompleted }
}
