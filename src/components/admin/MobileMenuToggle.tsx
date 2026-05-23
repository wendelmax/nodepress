"use client"

import React, { useState, useEffect } from "react"

export function MobileMenuToggle() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (typeof document !== "undefined") {
      if (nextState) {
        document.body.classList.add("np-sidebar-open")
      } else {
        document.body.classList.remove("np-sidebar-open")
      }
    }
  }

  // Clean up class when component unmounts
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("np-sidebar-open")
      }
    }
  }, [])

  return (
    <button 
      onClick={toggleMenu} 
      className="flex md:hidden items-center justify-center w-9 h-9 bg-white/5 hover:bg-white/10 text-text border border-border rounded-xl transition-all duration-200 cursor-pointer text-lg outline-none"
      aria-label="Toggle navigation menu"
    >
      {isOpen ? '✕' : '☰'}
    </button>
  )
}
