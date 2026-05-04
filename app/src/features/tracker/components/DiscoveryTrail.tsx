// Trilha de Descoberta Pós-Onboarding.
// Aparece na home abaixo do link "Personalizar" e antes dos suggestion cards.
// Guia o usuário pelas features de maior valor nos primeiros 14 dias.
// Lista de itens varia por faixa etária do bebê (3 buckets).
//
// Ciclo de vida:
// - Inicializa timestamp na primeira vez que monta (yaya_discovery_start_<babyId>)
// - Desaparece após 14 dias OU quando todos os itens estiverem concluídos
// - Pode ser dispensada pelo usuário (botão "Dispensar" no rodapé)
//
// Conclusão de cada item: lê as chaves yaya_evt_*_<babyId> setadas pelos
// trackOnce / setTrailKey do sistema de analytics — mesma fonte de verdade, zero queries.
//
// Refresh automático ao foco/visibilidade: sem isso, a trilha não re-checaria
// itens completados em outras telas enquanto o TrackerPage está montado.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { hapticLight } from '../../../lib/haptics'

interface TrailStep {
  id: string
  label: string
  doneKey: string      // localStorage key que marca o passo como concluído
  destination: string  // rota de navegação ao clicar
}

type AgeBucket = '0to3m' | '3to12m' | '12mplus'

const TRAIL_STEPS: Record<AgeBucket, TrailStep[]> = {
  '0to3m': [
    { id: 'record',   label: 'Faça seu primeiro registro',         doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'routine',  label: 'Ajuste a rotina e intervalos',       doneKey: 'yaya_evt_routine_configured',      destination: '/routine' },
    { id: 'insights', label: 'Veja os insights da rotina',         doneKey: 'yaya_evt_insights_tab_opened',     destination: '/insights' },
    { id: 'yaia',     label: 'Pergunte algo para a yaIA',          doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',   label: 'Convide alguém para o grupo',        doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',   label: 'Crie um relatório para o pediatra',  doneKey: 'yaya_evt_super_report_generated',  destination: '/profile' },
  ],
  '3to12m': [
    { id: 'record',     label: 'Faça seu primeiro registro',          doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'routine',    label: 'Ajuste a rotina e intervalos',        doneKey: 'yaya_evt_routine_configured',      destination: '/routine' },
    { id: 'milestones', label: 'Explore os marcos de desenvolvimento', doneKey: 'yaya_evt_milestone_registered',   destination: '/milestones' },
    { id: 'yaia',       label: 'Pergunte algo para a yaIA',           doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',     label: 'Convide alguém para o grupo',         doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',     label: 'Crie um relatório para o pediatra',   doneKey: 'yaya_evt_super_report_generated',  destination: '/profile' },
  ],
  '12mplus': [
    { id: 'record',  label: 'Faça seu primeiro registro',             doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'routine', label: 'Ajuste a rotina e intervalos',           doneKey: 'yaya_evt_routine_configured',      destination: '/routine' },
    { id: 'leaps',   label: 'Explore os saltos de desenvolvimento',   doneKey: 'yaya_evt_development_leap_opened', destination: '/saltos' },
    { id: 'yaia',    label: 'Pergunte algo para a yaIA',              doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',  label: 'Convide alguém para o grupo',            doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',  label: 'Crie um relatório para o pediatra',      doneKey: 'yaya_evt_super_report_generated',  destination: '/profile' },
  ],
}

function getAgeBucket(babyAgeWeeks: number): AgeBucket {
  if (babyAgeWeeks < 14) return '0to3m'
  if (babyAgeWeeks < 53) return '3to12m'
  return '12mplus'
}

interface Props {
  babyId: string
  babyAgeWeeks: number
  babyName: string
  /** Override de navegação por step.id — quando fornecido, chama a função em vez de navegar */
  onStepAction?: Record<string, () => void>
  /** Callback disparado uma única vez quando todos os passos são concluídos */
  onComplete?: () => void
}

export default function DiscoveryTrail({ babyId, babyAgeWeeks, babyName, onStepAction, onComplete }: Props) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  // Forçar re-render ao retornar de outra tela (itens podem ter sido completados)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  // Inicializar timestamp na primeira vez que monta
  const startKey = `yaya_discovery_start_${babyId}`
  const dismissKey = `yaya_trail_dismissed_${babyId}`
  const completedKey = `yaya_trail_completed_${babyId}`

  useEffect(() => {
    if (!localStorage.getItem(startKey)) {
      localStorage.setItem(startKey, String(Date.now()))
    }
  }, [startKey])

  const handleDismiss = useCallback(() => {
    hapticLight()
    localStorage.setItem(dismissKey, '1')
    forceUpdate((n) => n + 1)
  }, [dismissKey])

  // Verificar condições de visibilidade
  const dismissed = localStorage.getItem(dismissKey) === '1'
  const startTs = Number(localStorage.getItem(startKey) ?? '0')
  const daysSinceStart = startTs > 0 ? (Date.now() - startTs) / (1000 * 60 * 60 * 24) : 0
  const expired = daysSinceStart > 14

  if (dismissed || expired) return null

  const bucket = getAgeBucket(babyAgeWeeks)
  const steps = TRAIL_STEPS[bucket]

  // Verificar conclusão de cada passo — chave baby-scoped para isolar entre bebês
  const doneFlags = steps.map((s) => !!localStorage.getItem(`${s.doneKey}_${babyId}`))

  // Se todos os passos estiverem concluídos → celebrar (1x) e sumir
  const allDone = doneFlags.every(Boolean)
  if (allDone) {
    if (!localStorage.getItem(completedKey) && onComplete) {
      localStorage.setItem(completedKey, '1')
      onComplete()
    }
    return null
  }

  const doneCount = doneFlags.filter(Boolean).length

  return (
    <div className="mx-5 mt-3">
      <div
        className="rounded-md"
        style={{
          background: 'rgba(183,159,255,0.04)',
          border: '1px solid rgba(183,159,255,0.12)',
        }}
      >
        {/* Header — sempre visível, toque colapsa/expande */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-3"
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className="flex items-center gap-2">
            <span className="font-label text-[11px] font-bold uppercase tracking-wider text-primary/70">
              Explore o Yaya
            </span>
            <span
              className="font-label text-[10px] text-on-surface-variant/50 px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(183,159,255,0.1)' }}
            >
              {doneCount}/{steps.length + 1}
            </span>
          </div>
          <span
            className="material-symbols-outlined text-base text-on-surface-variant/40 transition-transform duration-200"
            style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            expand_more
          </span>
        </button>

        {/* Conteúdo colapsável */}
        {!collapsed && (
          <div className="px-3 pb-3">
            {/* Passo 0 — criar perfil (sempre concluído) */}
            <div className="flex items-center gap-2.5 py-1">
              <span
                className="material-symbols-outlined text-base flex-shrink-0"
                style={{ color: 'var(--md-sys-color-tertiary, #7dffba)', fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span className="font-label text-xs text-on-surface-variant/50 line-through">
                Criou o perfil {babyName !== '' ? `de ${babyName}` : ''}
              </span>
            </div>

            {/* Passos dinâmicos */}
            {steps.map((step, idx) => {
              const done = doneFlags[idx]
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={done}
                  onClick={() => {
                    if (done) return
                    hapticLight()
                    if (onStepAction?.[step.id]) {
                      onStepAction[step.id]()
                    } else {
                      navigate(step.destination)
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 py-1 text-left ${
                    done ? 'cursor-default' : 'active:opacity-70 transition-opacity'
                  }`}
                >
                  {done ? (
                    <span
                      className="material-symbols-outlined text-base flex-shrink-0"
                      style={{ color: 'var(--md-sys-color-tertiary, #7dffba)', fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base flex-shrink-0 text-on-surface-variant/30">
                      radio_button_unchecked
                    </span>
                  )}
                  <span
                    className={`font-label text-xs flex-1 min-w-0 text-left ${
                      done ? 'text-on-surface-variant/50 line-through' : 'text-on-surface'
                    }`}
                  >
                    {step.label}
                  </span>
                  {!done && (
                    <span className="material-symbols-outlined text-sm text-primary/50 flex-shrink-0">
                      chevron_right
                    </span>
                  )}
                </button>
              )
            })}

            {/* Botão discreto de dispensar */}
            <div className="mt-2 pt-2 border-t border-white/5 flex justify-center">
              <button
                type="button"
                onClick={handleDismiss}
                className="font-label text-[11px] text-on-surface-variant/35 hover:text-on-surface-variant/60 transition-colors px-2 py-1"
              >
                Dispensar guia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
