"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

interface PaginationProps {
  totalPages: number
  currentPage: number
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-between border-t border-border/40 bg-white/[0.01] px-4 py-3 mt-4 rounded-xl">
      <div className="flex flex-1 items-center justify-between">
        <div>
          <p className="text-xs text-text-secondary">
            Página <span className="font-semibold text-text">{currentPage}</span> de <span className="font-semibold text-text">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            {currentPage > 1 ? (
              <Link
                href={createPageURL(currentPage - 1)}
                className="relative inline-flex items-center rounded-l-md px-3 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-inset ring-border hover:bg-white/5 focus:z-20 transition-colors no-underline"
              >
                Anterior
              </Link>
            ) : (
              <span className="relative inline-flex items-center rounded-l-md px-3 py-1.5 text-xs font-semibold text-text-muted ring-1 ring-inset ring-border bg-white/[0.02] cursor-not-allowed">
                Anterior
              </span>
            )}
            
            {currentPage < totalPages ? (
              <Link
                href={createPageURL(currentPage + 1)}
                className="relative inline-flex items-center rounded-r-md px-3 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-inset ring-border hover:bg-white/5 focus:z-20 transition-colors no-underline"
              >
                Próxima
              </Link>
            ) : (
              <span className="relative inline-flex items-center rounded-r-md px-3 py-1.5 text-xs font-semibold text-text-muted ring-1 ring-inset ring-border bg-white/[0.02] cursor-not-allowed">
                Próxima
              </span>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}
