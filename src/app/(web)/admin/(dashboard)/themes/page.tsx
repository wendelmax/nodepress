import { Metadata } from 'next'
import { themes } from '@/themes/registry'
import { OptionService } from '@/services/option.service'
import { PaintBucket, CheckCircle } from 'lucide-react'
import { ThemeCard } from './ThemeCard'

export const metadata: Metadata = {
  title: 'Aparência | Temas',
}

export default async function ThemesPage() {
  const options = await OptionService.getOptions(['active_theme'])
  const activeThemeSlug = options['active_theme'] || 'default'

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold text-text leading-tight flex items-center gap-2">
            <PaintBucket className="text-primary" /> Temas Disponíveis
          </h1>
          <p className="text-sm text-text-muted mt-1">Personalize o visual e a experiência do seu site.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {Object.values(themes).map((theme) => {
          const isActive = theme.meta.slug === activeThemeSlug

          return (
            <ThemeCard 
              key={theme.meta.slug} 
              theme={theme.meta} 
              isActive={isActive} 
            />
          )
        })}
      </div>
    </div>
  )
}
