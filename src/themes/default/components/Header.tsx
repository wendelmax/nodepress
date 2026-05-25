import { MenuService } from "@/services/menu.service"
import { OptionService } from "@/services/option.service"
import HeaderClient from "./HeaderClient"

export default async function Header() {
  // 1. Fetch site options
  const options = await OptionService.getOptions(['blogname', 'blogdescription'])
  const siteTitle = options['blogname'] || 'NodePress'
  const tagline = options['blogdescription'] || 'Just another NodePress site'

  // 2. Fetch primary menu items
  const menuItems = await MenuService.getMenuItemsBySlug('primary')

  return (
    <HeaderClient 
      siteTitle={siteTitle} 
      tagline={tagline} 
      menuItems={menuItems} 
    />
  )
}
