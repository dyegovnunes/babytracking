// Trilha de Descoberta Pós-Onboarding.
// Aparece na home abaixo do link "Personalizar" e antes dos suggestion cards.
// Guia o usuário pelas features de maior valor nos primeiros 14 dias.
// Lista de itens varia por faixa etária do bebê (3 buckets).
//
// Ciclo de vida:
// - Inicializa timestamp na primeira vez que monta (yaya_discovery_start_<babyId>)
// - Desaparece após 14 dias OU quando todos os itens estiverem concluídos
// - Pode ser dispensada pelo usuário (yaya_trail_dismissed_<babyId>)
//
// Conclusão de cada item: lê as chaves yaya_evt_* setadas pelos trackOnce
// do sistema de analytics — mesma fonte de verdade, zero queries ao Supabase.
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
    { id: 'record',    label: 'Faça seu primeiro registro',         doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'insights',  label: 'Veja os insights da rotina',         doneKey: 'yaya_evt_insights_tab_opened',     destination: '/insights' },
    { id: 'yaia',      label: 'Pergunte algo para a yaIA',          doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',    label: 'Convide alguém para o grupo',        doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',    label: 'Crie um relatório para o pediatra',  doneKey: 'yaya_evt_super_report_viewed',     destination: '/profile' },
  ],
  '3to12m': [
    { id: 'record',     label: 'Faça seu primeiro registro',          doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'milestones', label: 'Explore os marcos de desenvolvimento', doneKey: 'yaya_evt_milestone_registered',   destination: '/milestones' },
    { id: 'yaia',       label: 'Pergunte algo para a yaIA',           doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',     label: 'Convide alguém para o grupo',         doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',     label: 'Crie um relatório para o pediatra',   doneKey: 'yaya_evt_super_report_viewed',     destination: '/profile' },
  ],
  '12mplus': [
    { id: 'record',  label: 'Faça seu primeiro registro',             doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'leaps',   label: 'Explore os saltos de desenvolvimento',   doneKey: 'yaya_evt_development_leap_opened', destination: '/saltos' },
    { id: 'yaia',    label: 'Pergunte algo para a yaIA',              doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',  label: 'Convide alguém para o grupo',            doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',  label: 'Crie um relatório para o pediatra',      doneKey: 'yaya_evt_super_report_viewed',     destination: '/profile' },
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
}

export default function DiscoveryTrail({ babyId, babyAgeWeeks, babyName, onStepAction }: Props) {
  const navigate = useNavigate()

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

  // Verificar conclusão de cada passo
  const doneFlags = steps.map((s) => !!localStorage.getItem(s.doneKey))

  // Se todos os passos estiverem concluídos, esconder silenciosamente
  const allDone = doneFlags.every(Boolean)
  if (allDone) return null

  const doneCount = doneFlags.filter(Boolean).length

  return (
    <div className="mx-5 mt-3">
      <div
        className="rounded-md p-3"
        style={{
          background: 'rgba(183,159,255,0.04)',
          border: '1px solid rgba(183,159,255,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
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
          <button
            type="button"
            onClick={handleDismiss}
            className="text-on-surface-variant/40 hover:text-on-surface-variant/70 transition-colors"
            aria-label="Dispensar trilha"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Passo 0 — criar perfil (sempre concluído) */}
        <div className="flex items-center gap-2.5 py-1">
          <span className="material-symbols-outlined text-base flex-shrink-0" style={{ color: 'var(--md-sys-color-tertiary, #7dffba)', fontVariationSettings: "'FILL' 1" }}>
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
                <span
                  className="material-symbols-outlined text-base flex-shrink-0 text-on-surface-variant/30"
                >
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
      </div>
    </div>
  )
}
