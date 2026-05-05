// Sheet educacional que aparece na primeira vez que o auto-sono dispara.
// Controlado por localStorage key: yaya_autosleep_intro_${babyId}.
// Explica o comportamento, oferece toggle inline e link para configurações.

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { contractionDe, type Gender } from '../../../lib/genderUtils'
import Toggle from '../../../pages/settings/components/Toggle'

interface Props {
  isOpen: boolean
  onClose: () => void
  babyName: string
  babyGender?: Gender
  eventLabel: string          // ex: "Amamentação", "Fralda molhada"
  autoSleepEnabled: boolean
  onToggle: () => Promise<void>
  onOpenSettings: () => void  // fecha sheet e navega para /routine
}

export default function AutoSleepIntroSheet({
  isOpen,
  onClose,
  babyName,
  babyGender,
  eventLabel,
  autoSleepEnabled,
  onToggle,
  onOpenSettings,
}: Props) {
  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  const de   = contractionDe(babyGender)
  const name = babyName || 'bebê'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl bg-surface-container-highest px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="material-symbols-outlined text-primary text-xl">bedtime</span>
          </div>
          <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
            Despertador registrado automaticamente
          </h2>
        </div>

        {/* Corpo */}
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-3">
          Como {de} {name} estava dormindo quando você registrou {eventLabel}, inserimos
          &ldquo;Acordou&rdquo; 5 minutos antes e &ldquo;Dormiu&rdquo; 30 minutos depois
          automaticamente.
        </p>
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-5">
          Assim você não precisa registrar vários eventos na madrugada sem perder a conta dos
          despertares. Você pode editar ou excluir esses registros normalmente pelo Histórico.
        </p>

        {/* Toggle inline */}
        <div className="bg-surface-container rounded-md px-4 py-3.5 flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-on-surface-variant text-lg">
            bedtime
          </span>
          <div className="flex-1">
            <p className="font-body text-sm text-on-surface">Registrar despertadores automaticamente</p>
            <p className="font-label text-[11px] text-on-surface-variant">
              Insere &ldquo;Acordou&rdquo; e &ldquo;Dormiu&rdquo; no sono noturno
            </p>
          </div>
          <Toggle value={autoSleepEnabled} onChange={onToggle} />
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex-1 py-3 rounded-md border border-outline-variant text-on-surface font-label text-sm font-semibold active:opacity-80 transition-opacity"
          >
            Ver configurações
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label text-sm font-semibold active:opacity-80 transition-opacity"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
