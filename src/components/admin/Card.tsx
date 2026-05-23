import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-border
        bg-surface-elevated
        bg-panel-gradient
        backdrop-blur-xl
        shadow-soft
        transition-all
        duration-300
        hover:border-primary/40
        hover:shadow-glow
        ${className}
      `}
    >
      {children}
    </div>
  )
}
