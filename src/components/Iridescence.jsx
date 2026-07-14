import React from 'react'
import { cn } from '../lib/utils'

/**
 * Iridescence component – glass‑morphism panel wrapper.
 * Applies a semi‑transparent frosted‑glass background with subtle
 * inner‑shadow and backdrop blur. Intended for premium mobile UI.
 */
export default function Iridescence({ children, className = '' }) {
  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.1)]',
        className
      )}
    >
      {children}
    </div>
  )
}
