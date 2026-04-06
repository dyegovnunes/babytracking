import { useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 h-14">
        <h1 className="font-headline text-lg font-bold text-on-surface tracking-tight">
          Ya<span className="text-primary">ya</span>
        </h1>
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Configurações"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-xl">
            settings
          </span>
        </button>
      </div>
    </header>
  )
}
