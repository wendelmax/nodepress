"use client"

import React, { useState } from 'react'
import Link from "next/link"

interface MenuItem {
  id: string | number
  title: string
  url: string
}

interface HeaderClientProps {
  siteTitle: string
  tagline: string
  menuItems: MenuItem[]
}

export default function HeaderClient({ siteTitle, tagline, menuItems }: HeaderClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40 shadow-soft">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group z-50 relative">
          <img src="/logo.png" alt={siteTitle} className="h-10 w-auto group-hover:scale-105 transition-transform" />
          <div className="hidden sm:block">
            <p className="text-[11px] text-text-muted font-medium tracking-wide uppercase">
              {tagline}
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Menu */}
        <div className="hidden md:flex items-center gap-8">
          {menuItems.length > 0 && (
            <nav>
              <ul className="flex items-center gap-6">
                {menuItems.map(item => (
                  <li key={item.id}>
                    <Link 
                      href={item.url} 
                      className="text-sm font-semibold text-text-secondary hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-primary after:transition-all hover:after:w-full pb-1"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Actions: Search & Admin */}
          <div className="flex items-center gap-4 border-l border-border/40 pl-4">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-text-secondary hover:text-white transition-colors"
              aria-label="Pesquisar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>

            <Link 
              href="/admin" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-border text-sm font-semibold text-text hover:bg-white/10 hover:border-border-strong hover:shadow-glow transition-all"
            >
              Painel Admin
              <span className="text-primary-light">→</span>
            </Link>
          </div>
        </div>

        {/* Mobile Toggle Buttons */}
        <div className="flex items-center gap-2 md:hidden z-50 relative">
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 text-text-secondary hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-text-secondary hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Search Overlay/Modal */}
      {isSearchOpen && (
        <div className="absolute top-full left-0 w-full bg-background-secondary border-b border-border/40 p-4 shadow-soft animate-in slide-in-from-top-2">
          <div className="max-w-3xl mx-auto flex items-center relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-4 text-text-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              autoFocus
              className="w-full bg-surface-elevated border border-border rounded-full py-3 pl-12 pr-4 text-sm text-text focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full h-[calc(100vh-73px)] bg-background/95 backdrop-blur-xl border-t border-border/40 p-6 md:hidden overflow-y-auto animate-in slide-in-from-top-5">
          <nav className="flex flex-col gap-6">
            <ul className="flex flex-col gap-4">
              {menuItems.map(item => (
                <li key={item.id} className="border-b border-border/20 pb-4">
                  <Link 
                    href={item.url} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-semibold text-text hover:text-primary transition-colors block"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4">
              <Link 
                href="/admin" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors"
              >
                Painel Admin
                <span>→</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
