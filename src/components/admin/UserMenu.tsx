"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { User, LogOut, ChevronDown } from "lucide-react"
import { useAdminTranslation } from "./AdminI18nProvider"

interface UserMenuProps {
  userName: string
  userInitial: string
}

export function UserMenu({ userName, userInitial }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { t } = useAdminTranslation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 bg-white/5 border border-border hover:bg-white/10 hover:border-primary/20 text-text-secondary hover:text-white p-1.5 md:px-3 md:py-1.5 rounded-xl transition-all duration-200 cursor-pointer font-sans text-xs font-semibold leading-none outline-none"
      >
        <div className="w-6 h-6 rounded-full bg-primary-gradient flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0">
          {userInitial}
        </div>
        <span className="hidden md:inline">{userName}</span>
        <span className={`text-[8px] transition-transform duration-200 flex items-center ${isOpen ? 'rotate-180' : ''} hidden md:flex`}>
          <ChevronDown size={14} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-44 bg-background-secondary border border-border rounded-xl shadow-soft p-1.5 flex flex-col gap-0.5 z-[150] transition-all">
          <Link 
            href="/admin/profile" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:bg-white/5 hover:text-white text-xs font-medium no-underline border-none bg-transparent w-full text-left transition-colors duration-150 cursor-pointer"
            onClick={() => setIsOpen(false)}
          >
            <span className="flex items-center justify-center w-4"><User size={14} /></span>
            <span>{t.header.profile}</span>
          </Link>
          
          <div className="h-px bg-border my-1" />
          
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-danger hover:bg-danger/10 text-xs font-semibold border-none bg-transparent w-full text-left transition-all duration-150 cursor-pointer"
          >
            <span className="flex items-center justify-center w-4"><LogOut size={14} /></span>
            <span>{t.header.logout}</span>
          </button>
        </div>
      )}
    </div>
  )
}
