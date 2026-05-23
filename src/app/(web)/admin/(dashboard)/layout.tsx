import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Fragment } from "react"
import { checkInstallation } from "@/lib/install"
import { HookService } from "@/services/hook.service"
import { CommandPalette } from "@/components/admin/CommandPalette"
import { UserMenu } from "@/components/admin/UserMenu"
import { MobileMenuToggle } from "@/components/admin/MobileMenuToggle"
import { OptionService } from "@/services/option.service"
import "@/plugins/registry"
import '../admin.css'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await checkInstallation()

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const options = await OptionService.getOptions(['blogname', 'siteurl'])
  const siteName = options['blogname'] || 'NodePress'
  const userName = session.user?.name || session.user?.email || 'Admin'
  const userInitial = userName.charAt(0).toUpperCase()

  const navGroups = [
    {
      label: 'Content',
      items: [
        { href: '/admin', label: 'Dashboard', icon: '⊞' },
        { href: '/admin/posts', label: 'Posts', icon: '✏️' },
        { href: '/admin/upload', label: 'Media', icon: '🖼️' },
        { href: '/admin/pages', label: 'Pages', icon: '📄' },
        { href: '/admin/comments', label: 'Comments', icon: '💬' },
      ],
    },
    {
      label: 'Taxonomy',
      items: [
        { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
        { href: '/admin/tags', label: 'Tags', icon: '🔖' },
      ],
    },
    {
      label: 'Customization',
      items: [
        { href: '/admin/themes', label: 'Themes', icon: '🎨' },
        { href: '/admin/plugins', label: 'Plugins', icon: '🔌' },
        { href: '/admin/menus', label: 'Menus', icon: '≡' },
      ],
    },
    {
      label: 'Administration',
      items: [
        { href: '/admin/users', label: 'Users', icon: '👤' },
        { href: '/admin/options-general', label: 'Settings', icon: '⚙️' },
        { href: '/admin/options-ai', label: 'AI', icon: '🤖' },
      ],
    },
  ]

  return (
    <div className="font-sans min-h-screen text-text bg-background">
      {/* ── Sidebar ── */}
      <aside className="np-sidebar fixed top-0 left-0 bottom-0 z-50 flex flex-col w-[220px] bg-sidebar-gradient border-r border-border -translate-x-full md:translate-x-0 transition-transform duration-300">
        {/* Logo */}
        <Link href="/admin" className="h-14 flex items-center px-4 border-b border-border gap-2.5 no-underline hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary-gradient flex items-center justify-center text-base text-white flex-shrink-0 animate-float">⚡</div>
          <div>
            <div className="text-text font-semibold text-sm tracking-wide leading-none">{siteName}</div>
            <div className="text-text-muted text-[10px] uppercase font-bold tracking-widest mt-1">NodePress</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="np-sidebar-nav flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-4">
          {navGroups.map(group => (
            <div key={group.label} className="flex flex-col gap-1">
              <div className="text-[10px] font-bold tracking-widest uppercase text-text-muted px-3.5 mb-1">{group.label}</div>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary text-sm font-medium hover:bg-white/5 hover:text-white transition-all duration-200 no-underline">
                  <span style={{ width: 18, textAlign: 'center', fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-background/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-text-muted px-1.5">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#22C55E] flex-shrink-0 animate-pulse" />
            <span>Site em produção</span>
          </div>
          <Link href="/" target="_blank" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors no-underline px-1.5">
            <span>↗</span> Ver site
          </Link>
        </div>
      </aside>

      {/* ── Top Bar ── */}
      <header className="fixed top-0 left-0 md:left-[220px] right-0 h-14 bg-background-secondary/80 backdrop-blur-md border-b border-border flex items-center px-4 md:px-6 gap-3 z-40 transition-all">
        <MobileMenuToggle />
        
        {/* Search trigger */}
        <div
          className="flex-1 max-w-[480px] hidden sm:flex items-center gap-2 bg-background-tertiary border border-border rounded-xl px-3 h-9 hover:border-primary/30 transition-all duration-200 cursor-default"
        >
          <span style={{ fontSize: 14, color: 'var(--np-text-muted)' }}>🔍</span>
          <span className="text-text-muted text-xs font-medium flex-1">Search or jump to... </span>
          <kbd className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded border border-border font-sans font-medium">⌘K</kbd>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Hook slot — plugins can add items here */}
          {(await HookService.doAction('admin_top_bar')).map((item, index) => (
            <Fragment key={`topbar-hook-${index}`}>{item}</Fragment>
          ))}

          {/* New Post */}
          <Link href="/admin/post-new" className="flex items-center gap-1.5 bg-primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl hover:shadow-neon transition-all duration-200 no-underline leading-none">
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Novo</span>
          </Link>

          {/* Notifications */}
          <div className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-secondary border border-border rounded-xl transition-all duration-200 cursor-pointer" title="Notifications">
            🔔
          </div>

          {/* Help */}
          <div className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-secondary border border-border rounded-xl transition-all duration-200 cursor-pointer" title="Help">
            ?
          </div>

          {/* User */}
          <UserMenu userName={userName} userInitial={userInitial} />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="ml-0 md:ml-[220px] mt-14 min-h-[calc(100vh-56px)] bg-background transition-all duration-300">
        <div className="p-5 md:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}
