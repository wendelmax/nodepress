import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border/40 bg-background-secondary pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="flex items-center group mb-4">
            <img src="/logo.png" alt="NodePress Logo" className="h-10 w-auto group-hover:scale-105 transition-transform" />
          </Link>
          <p className="text-xs text-text-muted leading-relaxed">
            Plataforma moderna de publicação em Next.js. Gerencie seu conteúdo com um painel SaaS Premium e alta performance.
          </p>
        </div>

        {/* Links: Produto */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-4">Produto</h3>
          <ul className="flex flex-col gap-3">
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Recursos</Link></li>
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Preços</Link></li>
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Integrações</Link></li>
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Changelog</Link></li>
          </ul>
        </div>

        {/* Links: Empresa */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-4">Empresa</h3>
          <ul className="flex flex-col gap-3">
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Sobre Nós</Link></li>
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Blog</Link></li>
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Carreiras</Link></li>
            <li><Link href="#" className="text-xs text-text-secondary hover:text-white transition-colors">Contato</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-sm font-semibold text-text mb-4">Inscreva-se</h3>
          <p className="text-xs text-text-muted mb-4 leading-relaxed">
            Receba as últimas novidades sobre o NodePress e dicas de desenvolvimento web.
          </p>
          <form className="flex gap-2">
            <input 
              type="email" 
              placeholder="Seu email" 
              className="w-full bg-surface-glass border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button 
              type="button" 
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors border border-border"
            >
              Assinar
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[11px] text-text-muted">
          &copy; {currentYear} NodePress. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-4">
          <Link href="#" className="text-[11px] text-text-muted hover:text-white transition-colors">Privacidade</Link>
          <Link href="#" className="text-[11px] text-text-muted hover:text-white transition-colors">Termos</Link>
        </div>
      </div>
    </footer>
  )
}
