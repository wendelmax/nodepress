import Link from 'next/link'
import { FileText, PawPrint, Plug, Puzzle, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MenuNode } from '@/services/menu.types'

const icons: Record<string, LucideIcon> = {
  FileText,
  PawPrint,
  Plug,
  Puzzle,
  Settings,
}

function PluginMenuItem({ item, depth = 0 }: { item: MenuNode, depth?: number }) {
  const Icon = (item.icon && icons[item.icon]) || Puzzle
  const href = item.href || '#'

  return (
    <div className="flex flex-col gap-1">
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text transition-colors no-underline"
        style={{ paddingLeft: `${14 + depth * 14}px` }}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </Link>
      {item.children.map((child) => <PluginMenuItem key={child.id} item={child} depth={depth + 1} />)}
    </div>
  )
}

export function PluginMenu({ menus }: { menus: MenuNode[] }) {
  return <>{menus.map((item) => <PluginMenuItem key={item.id} item={item} />)}</>
}
