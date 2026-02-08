import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  tone?: 'student' | 'admin'
  children: React.ReactNode
}

export function Card({ interactive = false, tone = 'student', className, children, ...props }: CardProps) {
  const toneStyles =
    tone === 'admin'
      ? 'bg-admin-bg-elevated text-admin-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
      : 'bg-student-bg-elevated text-student-text-primary shadow-[0_2px_4px_rgba(0,0,0,0.3)]'

  return (
    <div
      className={cn(
        'rounded-lg p-12',
        toneStyles,
        interactive && 'cursor-pointer transition-all duration-normal hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(0,0,0,0.4)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-xl font-heading font-bold', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-student-text-secondary', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-6 pt-6 border-t border-student-border-secondary', className)} {...props}>
      {children}
    </div>
  )
}
