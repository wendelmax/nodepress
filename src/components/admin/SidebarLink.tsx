"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarLinkProps {
  href: string
  label: string
  icon: string
  onClick?: () => void
  /** Extra pathname prefixes that should also mark this link as active */
  matchPaths?: string[]
}

export function SidebarLink({ href, label, icon, onClick, matchPaths = [] }: SidebarLinkProps) {
  const pathname = usePathname()

  // Dashboard is exact; all others use startsWith or explicit matchPaths
  const isActive = href === "/admin"
    ? pathname === "/admin"
    : pathname === href
      || pathname.startsWith(href + '/')
      || matchPaths.some(p => pathname === p || pathname.startsWith(p))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 no-underline ${
        isActive
          ? 'bg-primary/10 text-primary-light shadow-glow'
          : 'text-text-secondary hover:bg-white/5 hover:text-white'
      }`}
    >
      <span
        className={`w-[18px] text-center text-[15px] transition-colors duration-200 ${isActive ? 'text-primary-light' : 'text-text-muted'}`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
