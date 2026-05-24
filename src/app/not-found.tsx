import Link from 'next/link'
import { ThemeService } from '@/services/theme.service'
import { OptionService } from '@/services/option.service'

export default async function NotFound() {
  const Theme = await ThemeService.getActiveTheme()
  const options = await OptionService.getOptions(['blogname'])

  // Se o tema ativo possui uma página 404 personalizada, usamos ela
  if (Theme.NotFound) {
    return <Theme.NotFound options={options} />
  }

  // Fallback padrão se o tema não tiver 404
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 font-sans relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#a855f7]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center flex flex-col items-center">
        {/* 404 Text */}
        <h1 className="text-[120px] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 mb-2 drop-shadow-lg">
          404
        </h1>
        
        <h2 className="text-2xl md:text-3xl font-bold text-text mb-4">
          Página não encontrada
        </h2>
        
        <p className="text-text-secondary text-base leading-relaxed mb-10 max-w-md mx-auto">
          Parece que você se perdeu no espaço digital. A página que você está procurando foi movida, excluída ou nunca existiu.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Link 
            href="/" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary-gradient text-white font-bold text-sm shadow-neon hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Voltar ao Início
          </Link>
          <Link 
            href="/admin" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-elevated border border-white/10 text-text font-semibold text-sm hover:bg-white/5 hover:border-white/20 transition-all duration-300 backdrop-blur-md"
          >
            Painel Admin
          </Link>
        </div>
      </div>
      
      {/* Footer minimalista para a página de erro */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-text-muted">{options['blogname'] || 'NodePress CMS'} &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
