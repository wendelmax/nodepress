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
import { SidebarLink } from "@/components/admin/SidebarLink"
import { SearchTrigger } from "@/components/admin/SearchTrigger"
import { CreateNewDropdown } from "@/components/admin/CreateNewDropdown"
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

  const options = await OptionService.getOptions(['blogname', 'siteurl', 'np_cpt_registry'])
  const siteName = options['blogname'] || 'NodePress'
  const userName = session.user?.name || session.user?.email || 'Admin'
  const userInitial = userName.charAt(0).toUpperCase()

  let customPostTypes: any[] = []
  try {
    if (options['np_cpt_registry']) {
      customPostTypes = JSON.parse(options['np_cpt_registry'])
    }
  } catch (e) {}

  const contentItems = [
    { href: '/admin', label: 'Dashboard', icon: '⊞' },
    { href: '/admin/posts', label: 'Posts', icon: '✏️' },
    { href: '/admin/pages', label: 'Pages', icon: '📄' },
    ...customPostTypes.filter(c => c.public).map(c => ({
      href: `/admin/posts?type=${c.slug}`, // Redirects to edit feed with filter
      label: c.pluralName,
      icon: c.icon || '📌',
      matchPaths: [`/admin/posts?type=${c.slug}`] // For active state handling
    })),
    { href: '/admin/media', label: 'Media', icon: '🖼️' },
    { href: '/admin/comments', label: 'Comments', icon: '💬' },
  ]

  const navGroups = [
    {
      label: 'Content',
      items: contentItems,
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
      label: 'Tools',
      items: [
        { href: '/admin/tools/import-export', label: 'Import / Export', icon: '🛠️' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { href: '/admin/users', label: 'Users', icon: '👤' },
        { href: '/admin/settings/general', label: 'General', icon: '⚙️' },
        { href: '/admin/settings/reading', label: 'Reading', icon: '📖' },
        { href: '/admin/settings/permalinks', label: 'Permalinks', icon: '🔗' },
        { href: '/admin/settings/seo', label: 'SEO & Analytics', icon: '📊' },
        { href: '/admin/settings/storage', label: 'Storage', icon: '🗄️' },
        { href: '/admin/settings/ai', label: 'AI', icon: '🤖' },
        { href: '/admin/settings/cpt', label: 'Post Types', icon: '🧩' },
      ],
    },
  ]

  return (
    <div className="font-sans min-h-screen text-text bg-background">
      {/* ── Sidebar ── */}
      <aside className="np-sidebar fixed top-0 left-0 bottom-0 z-50 flex flex-col w-[220px] bg-sidebar-gradient border-r border-border -translate-x-full md:translate-x-0 transition-transform duration-300">
        {/* Logo */}
        <Link href="/admin" className="py-5 flex flex-col items-center justify-center border-b border-border gap-2.5 no-underline hover:opacity-90 transition-opacity">
          <img src="/logo.png" alt="NodePress Logo" className="h-8 w-auto flex-shrink-0" />
          <div className="text-text font-semibold text-sm tracking-wide leading-none text-center">
            {siteName}
          </div>
        </Link>

        {/* Navigation */}
        <nav className="np-sidebar-nav flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-4">
          {navGroups.map(group => (
            <div key={group.label} className="flex flex-col gap-1">
              <div className="text-[10px] font-bold tracking-widest uppercase text-text-muted px-3.5 mb-1">{group.label}</div>
              {group.items.map(item => (
                <SidebarLink 
                  key={item.href} 
                  href={item.href} 
                  label={item.label} 
                  icon={item.icon} 
                />
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
        <SearchTrigger />

        <div className="flex items-center gap-2 ml-auto">
          {/* Hook slot — plugins can add items here */}
          {(await HookService.doAction('admin_top_bar')).map((item, index) => (
            <Fragment key={`topbar-hook-${index}`}>{item}</Fragment>
          ))}

          {/* New Item Dropdown */}
          <CreateNewDropdown customPostTypes={customPostTypes.filter(c => c.public)} />

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
