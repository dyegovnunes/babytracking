// Sheet de introdução à yaIA — disparada pelo passo 'yaia' da DiscoveryTrail.
// Diferente do YaIAIntroModal (focado em consent LGPD), este sheet é focado em valor:
// o que a yaIA sabe sobre o bebê e exemplos concretos de perguntas por faixa etária.
//
// Ao clicar em "Ir para a yaIA":
//   - Seta yaya_trail_yaia_intro_seen_${babyId} = '1'
//   - Fecha o sheet
//   - Navega para /yaia
//
// A YaIAPage verifica essa chave para não exibir o YaIAIntroModal de novo
// (evita dois modais de introdução em sequência).

import { useNavigate } from 'react-router-dom'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'
import { markConsent } from '../../yaia/yaiaChatService'
import { contractionDe, article, type Gender } from '../../../lib/genderUtils'

interface Props {
  isOpen: boolean
  babyName: string
  babyAgeWeeks: number
  babyId: string
  babyGender?: Gender
  onClose: () => void
}

// Exemplos de perguntas por faixa etária — contextualizados com nome e gênero do bebê
function getExamples(babyName: string, babyAgeWeeks: number, art: string, pronoun: string): string[] {
  const n = babyName || 'o bebê'
  if (babyAgeWeeks < 14) {
    return [
      `Por que ${art} ${n} está dormindo menos que o normal?`,
      `Isso que ${pronoun} está fazendo é normal para essa idade?`,
      `Quanto tempo um bebê de ${Math.round(babyAgeWeeks)} semanas fica acordado?`,
    ]
  }
  if (babyAgeWeeks < 53) {
    return [
      `${art.charAt(0).toUpperCase() + art.slice(1)} ${n} comeu bem essa semana?`,
      `Quando devo introduzir alimentos sólidos?`,
      `Por que ${pronoun} está mais agitado essa semana?`,
    ]
  }
  return [
    `${art.charAt(0).toUpperCase() + art.slice(1)} ${n} está dormindo o suficiente?`,
    `O que esperar do próximo salto de desenvolvimento?`,
    `Quais palavras ${pronoun} deveria estar falando já?`,
  ]
}

export default function YaIATrailSheet({ isOpen, babyName, babyAgeWeeks, babyId, babyGender, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  const navigate = useNavigate()

  if (!isOpen) return null

  const name = babyName || 'bebê'
  const de   = contractionDe(babyGender)
  const art  = article(babyGender)
  const pron = babyGender === 'girl' ? 'ela' : 'ele'
  const examples = getExamples(babyName, babyAgeWeeks, art, pron)

  async function handleGo() {
    hapticLight()
    localStorage.setItem(`yaya_trail_yaia_intro_seen_${babyId}`, '1')
    // Marcar consent aqui evita que YaIAIntroModal apareça logo depois desta sheet.
    // O usuário leu o que a yaIA faz e clicou conscientemente — é consentimento informado.
    try { await markConsent() } catch { /* silencioso — yaIA ainda abre, modal cobre se necessário */ }
    onClose()
    navigate('/yaia')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--md-sys-color-surface-container-high, #1e1631)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
              A yaIA conhece {art} {name}
            </h2>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              Pode perguntar qualquer coisa, qualquer hora
            </p>
          </div>
        </div>

        {/* Corpo */}
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-4">
          Ela tem acesso a tudo que você registrou: sono, alimentação, fraldas, marcos de desenvolvimento. Não é uma IA genérica. Ela conhece a rotina {de} {name}.
        </p>

        {/* Exemplos de perguntas */}
        <div className="mb-6">
          <p className="font-label text-[11px] uppercase tracking-wider text-primary/60 font-bold mb-2.5">
            Exemplos do que perguntar agora
          </p>
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-md"
                style={{ background: 'rgba(183,159,255,0.06)', border: '1px solid rgba(183,159,255,0.1)' }}
              >
                <span className="material-symbols-outlined text-sm text-primary/50 flex-shrink-0 mt-0.5">
                  chat_bubble
                </span>
                <p className="font-body text-xs text-on-surface-variant leading-snug">
                  {ex}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Nota de privacidade */}
        <p className="font-body text-[10px] text-on-surface-variant/40 leading-relaxed mb-3 text-center">
          Ao continuar, o Yaya usa os dados registrados para personalizar as respostas.
        </p>

        {/* CTA */}
        <button
          type="button"
          onClick={() => void handleGo()}
          className="w-full py-3 rounded-md bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">smart_toy</span>
          Perguntar para a yaIA
        </button>
      </div>
    </div>
  )
}
