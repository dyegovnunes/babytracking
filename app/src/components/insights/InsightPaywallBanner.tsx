interface Props {
  remainingCount: number
  onUpgrade: () => void
}

export default function InsightPaywallBanner({ remainingCount, onUpgrade }: Props) {
  return (
    <div
      className="rounded-md p-4 text-center"
      style={{
        background:
          'linear-gradient(90deg, rgba(183,159,255,0.10), rgba(255,150,185,0.10))',
        border: '1px solid rgba(183,159,255,0.20)',
      }}
    >
      <p className="font-label text-sm text-on-surface mb-2">
        Mais {remainingCount} insight{remainingCount > 1 ? 's' : ''} disponíve
        {remainingCount > 1 ? 'is' : 'l'} com{' '}
        <span className="font-bold text-primary">Yaya+</span>
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="bg-primary text-surface font-label text-sm font-bold px-5 py-2 rounded-md active:scale-95 transition-transform"
      >
        Conhecer Yaya+
      </button>
    </div>
  )
}
