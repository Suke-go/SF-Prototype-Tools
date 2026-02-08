import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'yes' | 'no' | 'unknown'
  tone?: 'student' | 'admin'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  tone = 'student',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = cn(
    'font-body rounded-md transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    tone === 'admin' ? 'focus:ring-offset-white' : 'focus:ring-offset-black'
  )

  const studentVariantStyles = {
    primary:
      'bg-student-bg-tertiary text-student-text-primary hover:brightness-110 active:brightness-90 focus:ring-student-text-primary',
    secondary:
      'border border-student-border-primary bg-transparent text-student-text-primary hover:bg-student-bg-secondary focus:ring-student-text-primary',
    yes: 'bg-student-answer-yes text-white hover:brightness-110 active:brightness-90 focus:ring-student-answer-yes',
    no: 'bg-student-answer-no text-white hover:brightness-110 active:brightness-90 focus:ring-student-answer-no',
    unknown:
      'bg-student-answer-unknown text-white hover:brightness-110 active:brightness-90 focus:ring-student-answer-unknown',
  } as const

  const adminVariantStyles = {
    primary: 'bg-admin-accent-primary text-white hover:brightness-110 active:brightness-90 focus:ring-admin-accent-primary',
    secondary:
      'border border-admin-border-primary bg-transparent text-admin-text-primary hover:bg-admin-bg-secondary focus:ring-admin-accent-primary',
    yes: 'bg-admin-accent-primary text-white hover:brightness-110 active:brightness-90 focus:ring-admin-accent-primary',
    no: 'bg-admin-accent-secondary text-white hover:brightness-110 active:brightness-90 focus:ring-admin-accent-secondary',
    unknown: 'bg-admin-bg-tertiary text-admin-text-primary hover:brightness-105 active:brightness-95 focus:ring-admin-accent-primary',
  } as const

  const variantStyles = tone === 'admin' ? adminVariantStyles : studentVariantStyles

  const sizeStyles = {
    sm: 'min-h-[36px] px-4 py-1.5 text-sm',
    md: 'min-h-[44px] px-6 py-3 text-base',
    lg: 'min-h-[52px] px-8 py-4 text-lg',
  }

  return (
    <button className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}>
      {children}
    </button>
  )
}
