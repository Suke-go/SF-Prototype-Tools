import React, { useId } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ label, error, helperText, className, id, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id || `input-${generatedId}`

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-student-text-secondary mb-2"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-6 py-4 bg-student-bg-secondary border border-student-border-primary',
          'rounded-md text-student-text-primary placeholder-student-text-tertiary',
          'focus:outline-none focus:ring-2 focus:ring-student-text-primary focus:ring-offset-2 focus:ring-offset-student-bg-primary',
          'focus:border-student-text-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-fast',
          error && 'border-student-semantic-error focus:ring-student-semantic-error',
          className
        )}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-student-semantic-error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-student-text-tertiary">
          {helperText}
        </p>
      )}
    </div>
  )
}
