"use client"

import { useState, useRef, useEffect } from "react"
import { FileText, FilePlus, Tag, UserPlus, FileSignature, LayoutTemplate, FolderPlus, Menu } from "lucide-react"
import Link from "next/link"
import { useAdminTranslation } from "./AdminI18nProvider"

interface CustomPostType {
  slug: string
  singularName: string
  icon?: string
}

interface CreateNewDropdownProps {
  customPostTypes: CustomPostType[]
}

export function CreateNewDropdown({ customPostTypes = [] }: CreateNewDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { t } = useAdminTranslation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-primary-gradient text-white text-xs font-semibold px-4 py-2 rounded-xl hover:shadow-neon transition-all duration-200 leading-none border-none cursor-pointer"
      >
        <span className="text-base leading-none mt-[-1px]">+</span>
        <span>Novo</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-fadeIn origin-top-right">
          <div className="flex flex-col p-1.5">
            <Link 
              href="/admin/posts/new" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span>✏️</span> {t.header.new_post}
            </Link>
            <Link 
              href="/admin/pages/new" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span className="flex items-center text-text-muted"><FileText size={16} /></span> {t.header.new_page}
            </Link>
            
            {customPostTypes.length > 0 && (
              <div className="my-1 border-t border-border/50"></div>
            )}
            
            {customPostTypes.map(cpt => (
              <Link 
                key={cpt.slug}
                href={`/admin/posts/new?type=${cpt.slug}`} 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
              >
                <span className="flex items-center text-text-muted"><FilePlus size={16} /></span> {cpt.singularName || cpt.slug}
              </Link>
            ))}

            <div className="my-1 border-t border-border/50"></div>

            <Link 
              href="/admin/categories" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span>🏷️</span> Categoria
            </Link>
            <Link 
              href="/admin/tags" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span className="flex items-center text-text-muted"><Tag size={16} /></span> Tag
            </Link>
            <Link 
              href="/admin/menus" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span>≡</span> Menu
            </Link>
            <Link 
              href="/admin/users" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span className="flex items-center text-text-muted"><UserPlus size={16} /></span> Usuário
            </Link>
            <Link 
              href="/admin/settings/cpt" 
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-text hover:bg-white/5 hover:text-white rounded-lg transition-colors no-underline"
            >
              <span className="flex items-center text-text-muted"><LayoutTemplate size={16} /></span> Post Type
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
