import Link from 'next/link'
import { OptionService } from '@/services/option.service'
import BlockRenderer from './BlockRenderer'

export default async function Footer() {
  const options = await OptionService.getOptions(['site_footer_content'])
  const footerContent = options['site_footer_content']
  const currentYear = new Date().getFullYear()

  if (footerContent && footerContent !== '') {
    return (
      <footer className="w-full relative">
        <BlockRenderer content={footerContent} />
      </footer>
    )
  }

  return (
    <footer className="border-t border-border/40 bg-background pt-16 pb-8 relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>
      
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 relative z-10">
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="flex items-center group mb-6">
            <img src="/logo.png" alt="NodePress Logo" className="h-10 w-auto group-hover:scale-105 transition-transform" />
          </Link>
          <p className="text-sm text-text-muted leading-relaxed mb-6">
            Plataforma moderna de publicação em Next.js. Gerencie seu conteúdo com um painel SaaS Premium e alta performance.
          </p>
          
          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a href="#" className="p-2 rounded-full bg-surface-elevated border border-border text-text-secondary hover:text-white hover:border-primary/50 hover:shadow-glow transition-all" aria-label="Twitter">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </a>
            <a href="#" className="p-2 rounded-full bg-surface-elevated border border-border text-text-secondary hover:text-white hover:border-primary/50 hover:shadow-glow transition-all" aria-label="GitHub">
              <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>

        {/* Links: Produto */}
        <div>
          <h3 className="text-sm font-bold text-white mb-6 tracking-wide">Produto</h3>
          <ul className="flex flex-col gap-4">
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Recursos</Link></li>
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Preços</Link></li>
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Integrações</Link></li>
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Changelog</Link></li>
          </ul>
        </div>

        {/* Links: Empresa */}
        <div>
          <h3 className="text-sm font-bold text-white mb-6 tracking-wide">Empresa</h3>
          <ul className="flex flex-col gap-4">
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Sobre Nós</Link></li>
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Blog</Link></li>
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Carreiras</Link></li>
            <li><Link href="#" className="text-sm text-text-secondary hover:text-primary-light transition-colors">Contato</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-sm font-bold text-white mb-6 tracking-wide">Inscreva-se</h3>
          <p className="text-sm text-text-muted mb-4 leading-relaxed">
            Receba as últimas novidades sobre o NodePress e dicas de desenvolvimento web.
          </p>
          <form className="flex flex-col gap-3">
            <input 
              type="email" 
              placeholder="Seu email" 
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <button 
              type="button" 
              className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-xl text-sm font-bold transition-colors shadow-soft hover:shadow-glow"
            >
              Assinar Newsletter
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <p className="text-xs text-text-muted font-medium">
          &copy; {currentYear} NodePress. Todos os direitos reservados.
        </p>
        <div className="flex items-center gap-6">
          <Link href="#" className="text-xs text-text-muted hover:text-white transition-colors">Privacidade</Link>
          <Link href="#" className="text-xs text-text-muted hover:text-white transition-colors">Termos de Serviço</Link>
        </div>
      </div>
    </footer>
  )
}
