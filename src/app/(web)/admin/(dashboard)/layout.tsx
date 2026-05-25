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
import { LayoutDashboard, FileText, MessageSquare, Tag, Palette, Plug, Menu as MenuIcon, Users, Settings, BookOpen, Link as LinkIcon, Search, Bot, Puzzle, Wrench, Bell, HelpCircle, ClipboardList, ExternalLink } from "lucide-react"
import { AdminI18nProvider } from "@/components/admin/AdminI18nProvider"
import { getAdminDictionary } from "@/i18n"
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

  const options = await OptionService.getOptions(['blogname', 'siteurl', 'np_cpt_registry', 'site_language'])
  const siteName = options['blogname'] || 'NodePress'
  const userName = session.user?.name || session.user?.email || 'Admin'
  const userInitial = userName.charAt(0).toUpperCase()

  const siteLanguage = options['site_language'] || 'pt-BR'
  const dict = getAdminDictionary(siteLanguage)

  let customPostTypes: any[] = []
  try {
    if (options['np_cpt_registry']) {
      customPostTypes = JSON.parse(options['np_cpt_registry'])
    }
  } catch (e) {}


  const cptMenuLinks = customPostTypes.filter(c => c.public).map(c => ({
    href: `/admin/posts?type=${c.slug}`,
    label: c.pluralName,
    icon: <FileText size={18} />,
    matchPaths: [`/admin/posts?type=${c.slug}`]
  }))

  const pluginMenuLinks = await HookService.doAction('admin_sidebar_menu')

  const navGroups = [
    {
      label: dict.sidebar.content,
      items: [
        { href: '/admin', label: dict.sidebar.dashboard, icon: <LayoutDashboard size={18} /> },
        { href: '/admin/posts', label: dict.sidebar.posts, icon: <FileText size={18} />, matchPaths: ['/admin/posts/new', '/admin/categories'] },
        { href: '/admin/posts?post_type=page', label: dict.sidebar.pages, icon: <FileText size={18} />, matchPaths: ['/admin/posts/new?post_type=page'] },
        { href: '/admin/forms', label: dict.sidebar.forms, icon: <ClipboardList size={18} />, matchPaths: ['/admin/forms/new', '/admin/forms/[id]/edit'] },
        ...pluginMenuLinks,
        ...cptMenuLinks,
      ],
    },
    {
      label: 'Taxonomia',
      items: [
        { href: '/admin/comments', label: dict.sidebar.comments, icon: <MessageSquare size={18} /> },
        { href: '/admin/categories', label: 'Categorias', icon: <Tag size={18} /> },
        { href: '/admin/tags', label: 'Tags', icon: <Tag size={18} /> },
      ],
    },
    {
      label: dict.sidebar.appearance || 'Customização',
      items: [
        { href: '/admin/themes', label: dict.sidebar.themes, icon: <Palette size={18} /> },
        { href: '/admin/plugins', label: dict.sidebar.plugins, icon: <Plug size={18} /> },
        { href: '/admin/menus', label: 'Menus', icon: <MenuIcon size={18} /> },
      ],
    },
    {
      label: dict.sidebar.tools || 'Ferramentas',
      items: [
        { href: '/admin/tools/import-export', label: 'Import / Export', icon: <Wrench size={18} /> },
      ],
    },
    {
      label: dict.sidebar.settings || 'Configurações',
      items: [
        { href: '/admin/users', label: dict.sidebar.users, icon: <Users size={18} /> },
        { href: '/admin/settings/general', label: dict.sidebar.settings, icon: <Settings size={18} /> },
        { href: '/admin/settings/reading', label: 'Leitura', icon: <BookOpen size={18} /> },
        { href: '/admin/settings/permalinks', label: 'Links Permanentes', icon: <LinkIcon size={18} /> },
        { href: '/admin/settings/seo', label: 'SEO & Analytics', icon: <Search size={18} /> },
        { href: '/admin/settings/storage', label: 'Armazenamento', icon: <Search size={18} /> },
        { href: '/admin/settings/ai', label: 'Inteligência Artificial', icon: <Bot size={18} /> },
        { href: '/admin/settings/cpt', label: 'Tipos de Post (CPT)', icon: <Puzzle size={18} /> },
        { href: '/admin/settings/fields', label: dict.sidebar.custom_fields, icon: <ClipboardList size={18} /> },
      ],
    },
  ]

  return (
    <AdminI18nProvider dictionary={dict} lang={siteLanguage}>
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
            <ExternalLink size={14} /> Ver site
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
          <div className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-secondary border border-border rounded-xl transition-all duration-200 cursor-pointer relative" title="Notifications">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse border border-background"></span>
          </div>

          {/* Help */}
          <div className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-secondary border border-border rounded-xl transition-all duration-200 cursor-pointer" title="Help">
            <HelpCircle size={18} />
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
    </AdminI18nProvider>
  )
}
