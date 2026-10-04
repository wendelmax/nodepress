import { MenuService } from "@/services/menu.service"
import { ensureActivePluginsLoaded } from "@/services/plugin-factory"
import { OptionService } from "@/services/option.service"
import type { MenuNode } from "@/services/menu.types"
import HeaderClient from "./HeaderClient"
import ThemeTemplateRenderer from './ThemeTemplateRenderer'

export default async function Header({ context = 'home' }: { context?: 'home' | 'post' | 'page' | 'archive' }) {
  // 1. Fetch site options
  const options = await OptionService.getOptions(['blogname', 'blogdescription'])
  const siteTitle = options['blogname'] || 'NodePress'
  const tagline = options['blogdescription'] || 'Just another NodePress site'

  // 2. Fetch the database menu and the active plugins' public contributions.
  const menuItems = await MenuService.getMenuItemsBySlug('primary')
  await ensureActivePluginsLoaded()
  const pluginMenuItems = MenuService.getPluginMenuTree('public', (capability) => !capability)
    .flatMap((item) => flattenPluginMenu(item))

  const mergedMenuItems = [
    ...menuItems.map((item) => ({ ...item, order: item.order ?? 0 })),
    ...pluginMenuItems.map((item, index) => ({
      id: `plugin:${item.pluginId}:${item.id}`,
      title: item.label,
      url: item.href || '#',
      order: 1000 + index,
    })),
  ].sort((a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id)))

  return (
    <ThemeTemplateRenderer
      area="header"
      context={context}
      fallback={<HeaderClient
      siteTitle={siteTitle} 
      tagline={tagline} 
      menuItems={mergedMenuItems}
    />}
    />
  )
}

function flattenPluginMenu(item: MenuNode): MenuNode[] {
  return [item, ...item.children.flatMap((child) => flattenPluginMenu(child))]
}
