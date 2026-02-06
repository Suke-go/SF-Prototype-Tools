import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'yes' | 'no' | 'unknown'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-body rounded-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantStyles = {
    primary: 'bg-student-bg-tertiary text-student-text-primary hover:brightness-110 active:brightness-90 focus:ring-student-text-primary',
    secondary: 'bg-transparent border border-student-border-primary text-student-text-primary hover:bg-student-bg-secondary focus:ring-student-text-primary',
    yes: 'bg-student-accent-red text-white hover:brightness-110 active:brightness-90 focus:ring-student-accent-red',
    no: 'bg-student-accent-blue text-white hover:brightness-110 active:brightness-90 focus:ring-student-accent-blue',
    unknown: 'bg-student-accent-gray text-white hover:brightness-110 active:brightness-90 focus:ring-student-accent-gray',
  }
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[44px]',
    lg: 'px-8 py-4 text-lg min-h-[52px]',
  }

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
