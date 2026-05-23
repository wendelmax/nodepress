import React from 'react'

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
}

export function GlassButton({ children, className = '', ...props }: GlassButtonProps) {
  return (
    <button
      className={`
        px-5 py-2.5
        rounded-xl
        bg-white/5
        border border-white/10
        backdrop-blur-lg
        hover:bg-white/10
        hover:border-primary/30
        transition-all
        duration-300
        text-sm font-medium text-white
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
