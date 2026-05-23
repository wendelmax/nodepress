import Link from "next/link"
import { MenuService } from "@/services/menu.service"
import { OptionService } from "@/services/option.service"

export default async function Header() {
  // 1. Fetch site options
  const options = await OptionService.getOptions(['blogname', 'blogdescription'])
  const siteTitle = options['blogname'] || 'NodePress'
  const tagline = options['blogdescription'] || 'Just another NodePress site'

  // 2. Fetch primary menu items (assuming slug 'primary')
  // Se o menu 'primary' não existir, items será vazio.
  const menuItems = await MenuService.getMenuItemsBySlug('primary')

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40 shadow-soft">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center text-xl text-white shadow-glow group-hover:animate-pulseGlow transition-all">
            ⚡
          </div>
          <div>
            <h1 className="text-xl font-bold text-text leading-tight group-hover:text-primary-light transition-colors">
              {siteTitle}
            </h1>
            <p className="text-[11px] text-text-muted font-medium tracking-wide uppercase">
              {tagline}
            </p>
          </div>
        </Link>

        {/* Navigation Menu */}
        <div className="flex items-center gap-8">
          {menuItems.length > 0 && (
            <nav>
              <ul className="flex items-center gap-6">
                {menuItems.map(item => (
                  <li key={item.id}>
                    <Link 
                      href={item.url} 
                      className="text-sm font-semibold text-text-secondary hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all hover:after:w-full pb-1"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          
          {/* CTA Button */}
          <Link 
            href="/admin" 
            className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-border text-sm font-semibold text-text hover:bg-white/10 hover:border-border-strong hover:shadow-glow transition-all"
          >
            Painel Admin
            <span className="text-primary-light">→</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
