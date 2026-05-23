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
    <header style={{ backgroundColor: 'white', borderBottom: '1px solid #c3c4c7' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '36px', color: '#1d2327' }}>
          <Link href="/" style={{ color: '#1d2327', textDecoration: 'none' }}>
            {siteTitle}
          </Link>
        </h1>
        <p style={{ marginTop: '10px', color: '#646970', marginBottom: '20px' }}>{tagline}</p>

        {/* Navigation Menu */}
        {menuItems.length > 0 && (
          <nav>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {menuItems.map(item => (
                <li key={item.id}>
                  <Link href={item.url} style={{ color: '#2271b1', textDecoration: 'none', fontWeight: 600, fontSize: '15px' }}>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  )
}
