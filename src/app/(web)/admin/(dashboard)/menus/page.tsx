import { MenuService } from "@/services/menu.service"
import MenuEditor from "@/components/admin/MenuEditor"

export default async function MenusPage() {
  const menus = await MenuService.getMenus()

  return (
    <div>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        Menus
      </h1>
      <MenuEditor initialMenus={menus} />
    </div>
  )
}
