import { useAppState } from '../../../contexts/AppContext'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { mToStr } from '../utils'

export type InfoModalKind = 'sleep' | 'notifications' | null

interface Props {
  kind: InfoModalKind
  onClose: () => void
}

export default function InfoModals({ kind, onClose }: Props) {
  useSheetBackClose(!!kind, onClose)
  const { intervals } = useAppState()

  if (!kind) return null

  if (kind === 'sleep') {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-xl">bedtime</span>
            <h3 className="font-headline text-lg font-bold text-on-surface">
              Como funciona o sono
            </h3>
          </div>
          <div className="space-y-3">
            <InfoStep n={1}>
              Ao registrar <strong className="text-on-surface">"Dormiu"</strong>,
              calculamos quando o bebê deve acordar (duração da soneca).
            </InfoStep>
            <InfoStep n={2}>
              Ao registrar <strong className="text-on-surface">"Acordou"</strong>,
              calculamos quando deve dormir novamente (janela de sono).
            </InfoStep>
            <InfoStep n={3}>
              À noite, ative o{' '}
              <strong className="text-on-surface">horário de sono noturno</strong>{' '}
              para pausar os alertas automaticamente.
            </InfoStep>
          </div>
          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }

  // notifications
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-xl">notifications</span>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Como funcionam
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <p className="font-label text-xs text-primary font-semibold mb-1">
              Amamentação e Fralda
            </p>
            <p className="font-body text-sm text-on-surface-variant">
              Você recebe um alerta quando o intervalo está acabando (80%) e outro quando já passou.
            </p>
            <div className="bg-surface-container-low rounded-md p-2.5 mt-2 flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                breastfeeding
              </span>
              <div>
                <p className="font-body text-xs text-on-surface font-semibold">
                  Hora da amamentação!
                </p>
                <p className="font-label text-[11px] text-on-surface-variant">
                  Última amamentação foi há{' '}
                  {mToStr(intervals['feed']?.minutes ?? 180)}.
                </p>
              </div>
            </div>
          </div>
          <div>
            <p className="font-label text-xs text-primary font-semibold mb-1">Banho</p>
            <p className="font-body text-sm text-on-surface-variant">
              Alerta único 15 minutos antes do horário agendado.
            </p>
          </div>
          <div>
            <p className="font-label text-xs text-primary font-semibold mb-1">
              Horário de sono noturno
            </p>
            <p className="font-body text-sm text-on-surface-variant">
              Nenhum alerta durante o período configurado. Configure na seção de sono.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

function InfoStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="font-label text-xs text-primary font-bold">{n}</span>
      </span>
      <p className="font-body text-sm text-on-surface-variant">{children}</p>
    </div>
  )
}
