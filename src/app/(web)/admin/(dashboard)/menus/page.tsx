import { MenuService } from "@/services/menu.service"
import MenuEditor from "@/components/admin/MenuEditor"

export default async function MenusPage() {
  const menus = await MenuService.getMenus()

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-text leading-none">🗂️ Menus</h1>
        <p className="text-xs text-text-secondary mt-1.5">Crie e organize menus de navegação para o seu site.</p>
      </div>
      <MenuEditor initialMenus={menus} />
    </div>
  )
}
