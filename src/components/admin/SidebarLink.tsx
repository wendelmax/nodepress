"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

interface SidebarLinkProps {
  href: string
  label: string
  icon: React.ReactNode
  onClick?: () => void
  /** Extra pathname prefixes that should also mark this link as active */
  matchPaths?: string[]
}

export function SidebarLink({ href, label, icon, onClick, matchPaths = [] }: SidebarLinkProps) {
  const pathname = usePathname()

  const searchParams = useSearchParams()

  let isActive = false
  if (href === "/admin") {
    isActive = pathname === "/admin"
  } else {
    const hrefUrl = new URL(href, 'http://localhost')
    const matchUrls = matchPaths.map(p => new URL(p, 'http://localhost'))

    const isPathMatch = (url: URL) => pathname === url.pathname || pathname.startsWith(url.pathname + '/')
    
    const checkParams = (url: URL) => {
      let paramsMatch = true
      url.searchParams.forEach((val, key) => {
        if (searchParams.get(key) !== val) paramsMatch = false
      })
      return paramsMatch
    }

    if (isPathMatch(hrefUrl) && checkParams(hrefUrl)) {
      isActive = true
    } else if (matchUrls.some(url => isPathMatch(url) && checkParams(url))) {
      isActive = true
    }

    // Special case: /admin/posts without post_type in href should not be active if URL has post_type !== 'post'
    if (isActive && hrefUrl.pathname === '/admin/posts' && !hrefUrl.searchParams.has('post_type')) {
      const pt = searchParams.get('post_type')
      if (pt && pt !== 'post') isActive = false
    }
  }

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
        className={`w-[18px] flex items-center justify-center transition-colors duration-200 ${isActive ? 'text-primary-light' : 'text-text-muted'}`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
