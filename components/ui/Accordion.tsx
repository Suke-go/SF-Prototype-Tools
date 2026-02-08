'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

export interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Accordion({ title, children, defaultOpen = false, className }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('border border-student-border-secondary rounded-lg overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-student-bg-tertiary text-left text-student-text-primary hover:bg-student-bg-elevated transition-colors duration-fast flex items-center justify-between"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title}`}
      >
        <span className="font-medium">{title}</span>
        <span className={cn(
          'transition-transform duration-normal',
          isOpen && 'rotate-180'
        )}>
          ▼
        </span>
      </button>
      <div
        id={`accordion-content-${title}`}
        className={cn(
          'overflow-hidden transition-all duration-normal',
          isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="p-6 bg-student-bg-secondary text-student-text-secondary">
          {children}
        </div>
      </div>
    </div>
  )
}
