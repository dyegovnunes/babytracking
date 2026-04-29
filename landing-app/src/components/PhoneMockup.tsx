const buttons = [
  { emoji: '🤱', label: 'Peito Esq.', badge: 'E' },
  { emoji: '🤱', label: 'Peito Dir.', badge: 'D' },
  { emoji: '🤱', label: 'Ambos', badge: 'E+D' },
  { emoji: '🍼', label: 'Mamadeira', badge: '' },
  { emoji: '💧', label: 'Fralda Xixi', badge: '' },
  { emoji: '💩', label: 'Fralda Coco', badge: '' },
  { emoji: '🌙', label: 'Dormiu', badge: '' },
  { emoji: '☀️', label: 'Acordou', badge: '' },
  { emoji: '🛁', label: 'Banho', badge: '' },
]

export default function PhoneMockup() {
  return (
    <div className="phone-frame shadow-2xl">
      <div className="phone-notch" />

      {/* Status bar */}
      <div className="px-5 pt-2 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-purple/20 flex items-center justify-center">
            <span className="text-xs">👦</span>
          </div>
          <div>
            <span className="text-cloud text-[10px] font-bold font-headline">Guto</span>
            <span className="text-muted text-[8px] ml-1">· 4 meses</span>
          </div>
        </div>
        <span className="text-cloud font-headline font-extrabold text-sm">09:19</span>
      </div>

      {/* Prediction card */}
      <div className="mx-3 mb-3 px-3 py-2 rounded-xl bg-purple/10 border border-purple/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] text-muted">Proxima mamada</p>
            <p className="text-[11px] text-purple font-bold font-headline">em 42 min</p>
          </div>
          <span className="text-purple text-[10px]">🤱</span>
        </div>
      </div>

      {/* Activity grid */}
      <div className="px-3 grid grid-cols-3 gap-2">
        {buttons.map((btn) => (
          <div
            key={btn.label}
            className="rounded-xl bg-surface-high/80 py-2.5 flex flex-col items-center gap-1 border border-white/5"
          >
            <div className="relative">
              <span className="text-lg">{btn.emoji}</span>
              {btn.badge && (
                <span className="absolute -top-1 -right-3 text-[7px] text-purple font-bold bg-purple/20 rounded px-0.5">
                  {btn.badge}
                </span>
              )}
            </div>
            <span className="text-[8px] text-cloud/70 font-medium">{btn.label}</span>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-surface/90 border-t border-white/5 flex items-center justify-around px-4">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-purple">🏠</span>
          <span className="text-[7px] text-purple font-bold">Inicio</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted">📊</span>
          <span className="text-[7px] text-muted">Historico</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted">👤</span>
          <span className="text-[7px] text-muted">Perfil</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted">⚙️</span>
          <span className="text-[7px] text-muted">Config</span>
        </div>
      </div>
    </div>
  )
}
