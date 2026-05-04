// Trilha de Descoberta Pós-Onboarding — v2
// Cada passo tem três momentos: antes (contextualização), durante (ação) e depois (fechamento do loop).
// O "antes" é feito pelas intro sheets (via onStepAction).
// O "durante" é a navegação/ação em si.
// O "depois" é o mini-card inline que aparece dentro da trilha após o step ser concluído (por ~5s).
//
// Labels benefit-focused: comunicam o benefício, não a tarefa.
// Token [nome] é substituído pelo nome do bebê na renderização.
//
// Ciclo de vida:
// - Inicializa timestamp na primeira vez que monta (yaya_discovery_start_<babyId>)
// - Desaparece após 14 dias OU quando todos os itens estiverem concluídos
// - Pode ser dispensada pelo usuário (botão "Dispensar guia" no rodapé)
//
// Conclusão de cada item: lê as chaves yaya_evt_*_<babyId> setadas pelos
// trackOnce / setTrailKey do sistema de analytics — mesma fonte de verdade, zero queries.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { hapticLight } from '../../../lib/haptics'

interface TrailStep {
  id: string
  label: string        // Pode conter o token [nome] — substituído na renderização
  doneKey: string      // localStorage key que marca o passo como concluído
  destination: string  // rota de navegação ao clicar (usado só se não houver onStepAction)
}

type AgeBucket = '0to3m' | '3to12m' | '12mplus'

const TRAIL_STEPS: Record<AgeBucket, TrailStep[]> = {
  '0to3m': [
    { id: 'record',   label: 'Acompanhe tudo em um lugar',          doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'routine',  label: 'Ajuste para a rotina do [nome]',      doneKey: 'yaya_evt_routine_configured',      destination: '/routine' },
    { id: 'insights', label: 'Descubra os padrões do [nome]',       doneKey: 'yaya_evt_insights_tab_opened',     destination: '/insights' },
    { id: 'yaia',     label: 'Tenha uma IA que conhece o [nome]',   doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',   label: 'Cuide junto com quem você confia',    doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',   label: 'Compartilhe a rotina com o pediatra', doneKey: 'yaya_evt_super_report_generated',  destination: '/profile' },
  ],
  '3to12m': [
    { id: 'record',     label: 'Acompanhe tudo em um lugar',            doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'routine',    label: 'Ajuste para a rotina do [nome]',        doneKey: 'yaya_evt_routine_configured',      destination: '/routine' },
    { id: 'milestones', label: 'Acompanhe o desenvolvimento do [nome]', doneKey: 'yaya_evt_milestone_registered',    destination: '/milestones' },
    { id: 'yaia',       label: 'Tenha uma IA que conhece o [nome]',     doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',     label: 'Cuide junto com quem você confia',      doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',     label: 'Compartilhe a rotina com o pediatra',   doneKey: 'yaya_evt_super_report_generated',  destination: '/profile' },
  ],
  '12mplus': [
    { id: 'record',  label: 'Acompanhe tudo em um lugar',          doneKey: 'yaya_evt_first_record_created',    destination: '/' },
    { id: 'routine', label: 'Ajuste para a rotina do [nome]',      doneKey: 'yaya_evt_routine_configured',      destination: '/routine' },
    { id: 'leaps',   label: 'Explore os saltos do [nome]',         doneKey: 'yaya_evt_development_leap_opened', destination: '/saltos' },
    { id: 'yaia',    label: 'Tenha uma IA que conhece o [nome]',   doneKey: 'yaya_evt_yaia_first_message',      destination: '/yaia' },
    { id: 'invite',  label: 'Cuide junto com quem você confia',    doneKey: 'yaya_evt_family_invite_sent',      destination: '/' },
    { id: 'report',  label: 'Compartilhe a rotina com o pediatra', doneKey: 'yaya_evt_super_report_generated',  destination: '/profile' },
  ],
}

// Mensagens "depois" — exibidas inline na trilha logo após o step ser concluído.
// Token [nome] substituído pelo nome do bebê.
const STEP_AFTER_MESSAGES: Record<string, (name: string) => string> = {
  record:     (n) => `Pronto. O Yaya começou a acompanhar o ${n}. Cada registro vai tornando os padrões mais claros.`,
  routine:    (n) => `O Yaya agora conhece a rotina do ${n}. Você vai receber alertas na hora certa — não antes, não depois.`,
  insights:   (n) => `Isso é o Yaya trabalhando para você. Quanto mais você registrar, mais precisos ficam os padrões do ${n}.`,
  milestones: (n) => `Marco registrado. Isso vai para a linha do tempo do ${n} — e para o relatório do pediatra.`,
  leaps:      (n) => `Faz sentido, né? Quando você entende o salto, a agitação do ${n} vira informação, não mistério.`,
  yaia:       (n) => `Agora você tem uma IA que conhece a rotina completa do ${n}. Pode voltar quando quiser perguntar qualquer coisa.`,
  invite:     (n) => `Quando alguém aceitar, vai ver a rotina do ${n} em tempo real. Ninguém mais fica sem saber o que aconteceu.`,
  report:     (_) => `Esse link tem toda a rotina registrada. Na próxima consulta, o pediatra vai chegar com contexto, não só com a balança.`,
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
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)

  // Forçar re-render ao retornar de outra tela (itens podem ter sido completados)
  const [tick, setTick] = useState(0)
  const forceUpdate = () => setTick((n) => n + 1)

  useEffect(() => {
    const update = () => forceUpdate()
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
    forceUpdate()
  }, [dismissKey])

  // Verificar condições de visibilidade
  const dismissed = localStorage.getItem(dismissKey) === '1'
  const startTs = Number(localStorage.getItem(startKey) ?? '0')
  const daysSinceStart = startTs > 0 ? (Date.now() - startTs) / (1000 * 60 * 60 * 24) : 0
  const expired = daysSinceStart > 14

  const bucket = getAgeBucket(babyAgeWeeks)
  const steps = TRAIL_STEPS[bucket]

  // Verificar conclusão de cada passo — chave baby-scoped
  const doneFlags = steps.map((s) => !!localStorage.getItem(`${s.doneKey}_${babyId}`))

  // Detectar step recém-concluído para mostrar mensagem "depois"
  const prevDoneFlagsRef = useRef<boolean[]>([])
  useEffect(() => {
    const prev = prevDoneFlagsRef.current
    if (prev.length > 0 && prev.length === doneFlags.length) {
      steps.forEach((step, i) => {
        if (!prev[i] && doneFlags[i]) {
          const afterKey = `yaya_trail_step_after_${step.id}_${babyId}`
          if (!localStorage.getItem(afterKey)) {
            localStorage.setItem(afterKey, '1')
            setJustCompletedId(step.id)
            setTimeout(() => setJustCompletedId(null), 5000)
          }
        }
      })
    }
    prevDoneFlagsRef.current = [...doneFlags]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  if (dismissed || expired) return null

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
            <span
              className="material-symbols-outlined text-sm"
              style={{ color: 'var(--md-sys-color-tertiary, #7dffba)' }}
            >
              route
            </span>
            <span
              className="font-label text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--md-sys-color-tertiary, #7dffba)' }}
            >
              Explore o Yaya
            </span>
            <span
              className="font-label text-[10px] px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(125,255,186,0.1)',
                color: 'rgba(125,255,186,0.6)',
              }}
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
                {babyName !== '' ? `Criou o perfil de ${babyName}` : 'Criou o perfil do bebê'}
              </span>
            </div>

            {/* Passos dinâmicos */}
            {steps.map((step, idx) => {
              const done = doneFlags[idx]
              const resolvedLabel = step.label.replace('[nome]', babyName)
              const afterMessage = justCompletedId === step.id
                ? STEP_AFTER_MESSAGES[step.id]?.(babyName) ?? null
                : null

              return (
                <div key={step.id}>
                  <button
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
                      {resolvedLabel}
                    </span>
                    {!done && (
                      <span className="material-symbols-outlined text-sm text-primary/50 flex-shrink-0">
                        chevron_right
                      </span>
                    )}
                  </button>

                  {/* Mini-card "depois" — aparece por ~5s logo após o step ser concluído */}
                  {done && afterMessage && (
                    <button
                      type="button"
                      onClick={() => setJustCompletedId(null)}
                      className="w-full text-left ml-6 mb-1.5 rounded-md px-3 py-2 active:opacity-70 transition-opacity"
                      style={{
                        background: 'rgba(125,255,186,0.06)',
                        border: '1px solid rgba(125,255,186,0.15)',
                      }}
                    >
                      <p className="font-body text-xs text-on-surface-variant/80 leading-relaxed">
                        {afterMessage}
                      </p>
                    </button>
                  )}
                </div>
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
