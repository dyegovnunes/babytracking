export default function Footer() {
  return (
    <footer className="border-t border-border py-10 px-5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple to-blush flex items-center justify-center text-sm">
            🍼
          </div>
          <div>
            <span className="font-headline font-extrabold text-cloud text-lg">yaya</span>
            <p className="font-body text-xs text-muted">O companheiro dos primeiros dias.</p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-body text-sm text-muted">
          <a href="#features" className="hover:text-cloud transition-colors">Funcionalidades</a>
          <a href="#planos" className="hover:text-cloud transition-colors">Planos</a>
          <a href="https://blog.yayababy.app" className="hover:text-cloud transition-colors">Blog</a>
          <a href="/privacy.html" className="hover:text-cloud transition-colors">Privacidade</a>
        </div>

        <p className="font-body text-xs text-muted/60">
          &copy; {new Date().getFullYear()} Yaya. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  )
}
