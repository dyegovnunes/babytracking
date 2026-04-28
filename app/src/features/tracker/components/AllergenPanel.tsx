/**
 * AllergenPanel — rastreio dos 8 principais alérgenos.
 *
 * Lê logs de refeição com allergenKey preenchido e calcula:
 *   not_tested     → alérgeno nunca introduzido
 *   window_active  → introduzido há < 3 dias (janela de segurança)
 *   introduced     → introduzido há ≥ 3 dias com segurança
 *
 * Exibe um banner de alerta quando há janela ativa e um painel
 * expansível com o status de todos os 8 alérgenos.
 *
 * Só renderiza quando o bebê tem ≥ 6 meses.
 */

import { useState, useMemo } from 'react'
import { hapticLight } from '../../../lib/haptics'
import type { LogEntry, MealPayload } from '../../../types'

interface Props {
  logs: LogEntry[]
  /** Idade em dias — painel só aparece a partir de 6 meses */
  ageDays: number
}

const ALLERGENS: { id: string; label: string; emoji: string }[] = [
  { id: 'leite_vaca',  label: 'Leite de vaca',   emoji: '🥛' },
  { id: 'ovo',         label: 'Ovo',              emoji: '🥚' },
  { id: 'amendoim',    label: 'Amendoim',         emoji: '🥜' },
  { id: 'trigo',       label: 'Trigo / Glúten',   emoji: '🌾' },
  { id: 'soja',        label: 'Soja',             emoji: '🫘' },
  { id: 'oleaginosas', label: 'Oleaginosas',      emoji: '🌰' },
  { id: 'peixe',       label: 'Peixe',            emoji: '🐟' },
  { id: 'frutos_mar',  label: 'Frutos do mar',    emoji: '🦐' },
]

const WINDOW_DAYS = 3

type AllergenStatus = 'not_tested' | 'window_active' | 'introduced'

interface AllergenInfo {
  id: string
  label: string
  emoji: string
  status: AllergenStatus
  daysAgo?: number
  lastTs?: number
}

function calcStatus(lastTs: number | undefined): AllergenStatus {
  if (!lastTs) return 'not_tested'
  const days = (Date.now() - lastTs) / (1000 * 60 * 60 * 24)
  return days < WINDOW_DAYS ? 'window_active' : 'introduced'
}

const STATUS_CONFIG: Record<AllergenStatus, { dot: string; badge: string; label: string }> = {
  not_tested:    { dot: 'bg-on-surface/20',  badge: 'text-on-surface-variant/50',  label: 'Não testado' },
  window_active: { dot: 'bg-amber-400',      badge: 'text-amber-500',              label: 'Janela ativa' },
  introduced:    { dot: 'bg-secondary',      badge: 'text-secondary',              label: 'Introduzido' },
}

export default function AllergenPanel({ logs, ageDays }: Props) {
  const [expanded, setExpanded] = useState(false)

  const allergenInfos = useMemo<AllergenInfo[]>(() => {
    // Index: allergenKey → último timestamp
    const lastByKey: Record<string, number> = {}
    for (const log of logs) {
      if (log.eventId !== 'meal' || !log.payload) continue
      const key = (log.payload as MealPayload).allergenKey
      if (!key) continue
      if (!lastByKey[key] || log.timestamp > lastByKey[key]) {
        lastByKey[key] = log.timestamp
      }
    }

    return ALLERGENS.map((a) => {
      const lastTs = lastByKey[a.id]
      const status = calcStatus(lastTs)
      const daysAgo = lastTs
        ? Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24))
        : undefined
      return { ...a, status, daysAgo, lastTs }
    })
  }, [logs])

  // Só mostra a partir de 6 meses
  if (ageDays < 180) return null

  const activeWindows = allergenInfos.filter((a) => a.status === 'window_active')
  const introduced    = allergenInfos.filter((a) => a.status === 'introduced')
  const notTested     = allergenInfos.filter((a) => a.status === 'not_tested')

  // Nada testado ainda e não expandido → mostra só o trigger discreto
  const hasAnyData = introduced.length > 0 || activeWindows.length > 0

  return (
    <section className="mx-5 mt-4">
      {/* Banner de janela ativa */}
      {activeWindows.length > 0 && (
        <div className="mb-2 px-4 py-3 rounded-md bg-amber-500/12 border border-amber-400/30 flex items-start gap-2">
          <span className="material-symbols-outlined text-amber-400 text-base mt-0.5 shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <p className="font-label text-xs font-semibold text-amber-400 mb-0.5">
              Janela de segurança ativa
            </p>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {activeWindows.map((a) => {
                const daysLeft = WINDOW_DAYS - (a.daysAgo ?? 0)
                return `${a.emoji} ${a.label} — aguarde ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
              }).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Card principal */}
      <div className="bg-surface-container rounded-md border border-outline-variant/30 overflow-hidden">
        {/* Header clicável */}
        <button
          onClick={() => { hapticLight(); setExpanded((e) => !e) }}
          className="flex items-center gap-3 w-full px-4 py-3 text-left active:bg-surface-container-high"
        >
          <span className="text-lg">🧬</span>
          <div className="flex-1 min-w-0">
            <p className="font-label text-sm font-semibold text-on-surface">Alérgenos</p>
            <p className="font-body text-xs text-on-surface-variant">
              {!hasAnyData
                ? 'Nenhum introduzido ainda'
                : `${introduced.length} introduzido${introduced.length !== 1 ? 's' : ''} · ${notTested.length} pendente${notTested.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {/* Dots de status */}
          <div className="flex items-center gap-1 shrink-0">
            {activeWindows.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            {introduced.length > 0 && (
              <span className="font-label text-[10px] text-secondary font-semibold">
                {introduced.length}/8
              </span>
            )}
          </div>
          <span className={`material-symbols-outlined text-on-surface-variant/50 text-base transition-transform ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {/* Grid de alérgenos (expansível) */}
        {expanded && (
          <div className="border-t border-outline-variant/20 px-4 py-3">
            <div className="grid grid-cols-2 gap-1.5">
              {allergenInfos.map((a) => {
                const cfg = STATUS_CONFIG[a.status]
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface"
                  >
                    <span className="text-base leading-none w-5 text-center shrink-0">{a.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs text-on-surface truncate">{a.label}</p>
                      <p className={`font-label text-[10px] ${cfg.badge}`}>
                        {a.status === 'window_active' && a.daysAgo !== undefined
                          ? `Dia ${a.daysAgo + 1} de ${WINDOW_DAYS}`
                          : a.status === 'introduced' && a.daysAgo !== undefined
                            ? `Há ${a.daysAgo}d`
                            : cfg.label}
                      </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  </div>
                )
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant/20">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="font-label text-[10px] text-on-surface-variant/60">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
