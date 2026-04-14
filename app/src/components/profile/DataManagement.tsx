import { useState } from 'react'
import { jsPDF } from 'jspdf'
import type { LogEntry } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { formatTime, formatDate } from '../../lib/formatters'
import { usePremium } from '../../hooks/usePremium'
import { PaywallModal } from '../ui/PaywallModal'

interface Props {
  logs: LogEntry[]
  babyName: string
  onClearHistory: () => void
}

export default function DataManagement({ logs, babyName, onClearHistory }: Props) {
  const [confirmClear, setConfirmClear] = useState(false)
  const { isPremium } = usePremium()
  const [showPaywall, setShowPaywall] = useState(false)

  function handleExportPDF() {
    if (!isPremium) {
      setShowPaywall(true)
      return
    }
    const doc = new jsPDF()
    const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp)

    // Title
    doc.setFontSize(20)
    doc.text(`Yaya — ${babyName}`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')} — ${sorted.length} registros`, 14, 28)

    // Table header
    let y = 40
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Data', 14, y)
    doc.text('Horário', 45, y)
    doc.text('Atividade', 70, y)
    doc.text('Detalhes', 130, y)
    doc.setFont('helvetica', 'normal')

    y += 6
    doc.setDrawColor(200)
    doc.line(14, y, 196, y)
    y += 4

    for (const log of sorted) {
      if (y > 280) {
        doc.addPage()
        y = 20
      }

      const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
      const date = new Date(log.timestamp)

      doc.text(formatDate(date), 14, y)
      doc.text(formatTime(date), 45, y)
      doc.text(event?.label ?? log.eventId, 70, y)
      doc.text(log.ml ? `${log.ml}ml` : '', 130, y)

      y += 6
    }

    doc.save(`yaya-${babyName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleExportPDF}
        className="w-full bg-surface-container rounded-lg p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-primary text-xl">
          picture_as_pdf
        </span>
        <div className="flex-1 text-left">
          <p className="text-on-surface font-body text-sm font-medium">Exportar relatório</p>
          <p className="text-on-surface-variant font-label text-xs">
            {logs.length} registro{logs.length !== 1 ? 's' : ''} em PDF
          </p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-xl">
          chevron_right
        </span>
      </button>

      {!confirmClear ? (
        <button
          onClick={() => setConfirmClear(true)}
          className="w-full bg-surface-container rounded-lg p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-error text-xl">
            delete_sweep
          </span>
          <div className="flex-1 text-left">
            <p className="text-on-surface font-body text-sm font-medium">Limpar histórico</p>
            <p className="text-on-surface-variant font-label text-xs">Remove todos os registros</p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            chevron_right
          </span>
        </button>
      ) : (
        <div className="bg-error/10 rounded-lg p-4">
          <p className="text-error font-body text-sm font-medium mb-3">
            Tem certeza? Isso apagará todos os {logs.length} registros.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmClear(false)}
              className="flex-1 py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onClearHistory()
                setConfirmClear(false)
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-error-dim to-error text-on-error font-label font-semibold text-sm"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="pdf"
      />
    </div>
  )
}
