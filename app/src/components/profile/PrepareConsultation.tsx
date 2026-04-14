import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { generatePediatricPDF } from '../../lib/generatePDF';
import { usePDFData } from '../../hooks/usePDFData';
import { usePremium } from '../../hooks/usePremium';
import { useAppState } from '../../contexts/AppContext';
import { PaywallModal } from '../ui/PaywallModal';
import { hapticSuccess, hapticLight, hapticMedium } from '../../lib/haptics';

export default function PrepareConsultation() {
  const { isPremium } = usePremium();
  const { baby } = useAppState();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pdfData = usePDFData(periodDays);

  const handleButtonClick = () => {
    hapticLight();
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setShowConfig(true);
  };

  const handleGenerate = async () => {
    if (!baby || !pdfData) return;
    hapticMedium();
    setIsGenerating(true);
    setError(null);

    try {
      // Generate QR code
      let qrDataUrl: string | undefined;
      try {
        const QRCode = await import('qrcode');
        qrDataUrl = await QRCode.toDataURL('https://yayababy.app/pediatra', {
          width: 80,
          margin: 1,
          color: { dark: '#7C4DFF', light: '#FFFFFF' },
        });
      } catch {
        // QR generation failed — skip
      }

      const doc = generatePediatricPDF(pdfData, baby, qrDataUrl);
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setPdfReady(true);
      hapticSuccess();
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar o PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!pdfUrl || !baby) return;
    hapticLight();

    const fileName = `yaya-${baby.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        // Read blob as base64
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];

          // Save to cache directory
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          await Share.share({
            title: `Relatorio ${baby.name}`,
            text: `Relatorio de acompanhamento - ${baby.name}`,
            url: result.uri,
            dialogTitle: 'Compartilhar relatorio',
          });
        };
        reader.readAsDataURL(blob);
      } catch {
        // Fallback: direct download
        downloadPDF(pdfUrl, fileName);
      }
    } else {
      downloadPDF(pdfUrl, fileName);
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl || !baby) return;
    hapticLight();
    const fileName = `yaya-${baby.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onload = async () => {
          const base64Data = (reader.result as string).split(',')[1];

          await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });

          hapticSuccess();
          alert('PDF salvo na pasta Downloads!');
        };
        reader.readAsDataURL(blob);
      } catch {
        // Fallback: tenta salvar no cache e compartilhar
        try {
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Share } = await import('@capacitor/share');

          const response = await fetch(pdfUrl);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onload = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const result = await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Cache,
            });

            await Share.share({
              title: `Salvar ${fileName}`,
              url: result.uri,
              dialogTitle: 'Salvar PDF',
            });
          };
          reader.readAsDataURL(blob);
        } catch {
          downloadPDF(pdfUrl, fileName);
        }
      }
    } else {
      downloadPDF(pdfUrl, fileName);
    }
  };

  const handleClose = () => {
    setShowConfig(false);
    setPdfReady(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setError(null);
  };

  if (!baby) return null;

  return (
    <>
      {/* Button */}
      <button
        onClick={handleButtonClick}
        className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-md p-4 flex items-center gap-3 active:bg-primary/15 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">clinical_notes</span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-on-surface font-headline text-sm font-bold">Preparar para consulta</p>
          <p className="text-on-surface-variant font-label text-xs">
            Gere o relatorio do pediatra
          </p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-xl">chevron_right</span>
      </button>

      {/* Config bottom sheet */}
      {showConfig && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-[#0d0a27] border border-[#b79fff]/20 p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">clinical_notes</span>
                <h3 className="text-base font-bold text-[#e7e2ff]">Relatorio do Pediatra</h3>
              </div>
              <button onClick={handleClose} className="text-[#e7e2ff]/40">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {!pdfReady ? (
              <>
                {/* Period selector */}
                <div className="mb-5">
                  <p className="font-label text-xs text-[#e7e2ff]/60 uppercase tracking-wider mb-2">Periodo</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 15, 30].map((d) => (
                      <button
                        key={d}
                        onClick={() => { hapticLight(); setPeriodDays(d); }}
                        className={`py-2.5 rounded-xl font-label text-sm font-semibold transition-colors ${
                          periodDays === d
                            ? 'bg-[#b79fff] text-[#0d0a27]'
                            : 'bg-white/[0.06] text-[#e7e2ff]/70'
                        }`}
                      >
                        {d} dias
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info about content */}
                <div className="bg-white/[0.04] rounded-xl p-3 mb-5">
                  <p className="font-label text-xs text-[#e7e2ff]/60 mb-2">O relatorio inclui:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: 'restaurant', label: 'Amamentacao' },
                      { icon: 'bedtime', label: 'Sono' },
                      { icon: 'baby_changing_station', label: 'Fraldas' },
                      { icon: 'straighten', label: 'Crescimento' },
                      { icon: 'show_chart', label: 'Graficos' },
                      { icon: 'monitoring', label: 'Curva OMS' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#b79fff] text-sm">{item.icon}</span>
                        <span className="font-body text-xs text-[#e7e2ff]/70">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data summary */}
                {pdfData && (
                  <div className="bg-white/[0.04] rounded-xl p-3 mb-5">
                    <p className="font-label text-xs text-[#e7e2ff]/60 mb-1.5">Dados no periodo</p>
                    <p className="font-headline text-2xl font-bold text-[#e7e2ff]">{pdfData.totalLogs}</p>
                    <p className="font-label text-xs text-[#e7e2ff]/40">registros encontrados</p>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-red-400 text-center mb-3">{error}</p>
                )}

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !pdfData}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#b79fff] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      Gerando relatorio...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                      Gerar Relatorio
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* PDF ready */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-green-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
                  </div>
                  <h4 className="font-headline text-lg font-bold text-[#e7e2ff] mb-1">Relatorio pronto!</h4>
                  <p className="font-body text-xs text-[#e7e2ff]/60">
                    PDF de 2 paginas com dados dos ultimos {periodDays} dias
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="w-full py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">share</span>
                    Compartilhar
                  </button>

                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    className="w-full py-3 rounded-xl bg-white/[0.06] text-[#e7e2ff] font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Salvar no dispositivo
                  </button>

                  {/* Close */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl text-[#e7e2ff]/40 font-semibold text-sm"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Paywall */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="pdf"
      />
    </>
  );
}

function downloadPDF(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
