import yayaLogo from '../../assets/yaya-logo.png'

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant py-10 px-5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src={yayaLogo} alt="Yaya" className="h-8 w-8 object-contain" />
          <div>
            <span className="font-headline font-extrabold text-on-surface text-lg">Yaya</span>
            <p className="font-body text-xs text-on-surface-variant">O companheiro dos primeiros dias.</p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-body text-sm text-on-surface-variant">
          <a href="#features" className="hover:text-on-surface transition-colors">Funcionalidades</a>
          <a href="#planos" className="hover:text-on-surface transition-colors">Planos</a>
          <a href="https://blog.yayababy.app" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface transition-colors">Blog</a>
          <a href="/privacy" className="hover:text-on-surface transition-colors">Privacidade</a>
        </div>

        <p className="font-body text-xs text-on-surface-variant/60">
          &copy; {new Date().getFullYear()} Yaya. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
