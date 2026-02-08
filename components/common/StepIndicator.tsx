'use client'

import { cn } from '@/lib/utils'

export type StepDef = {
  key: string
  label: string
  path: string
}

type StepIndicatorProps = {
  steps: StepDef[]
  currentKey: string
  completedKeys: string[]
  onNavigate?: (path: string) => void
}

export function StepIndicator({ steps, currentKey, completedKeys, onNavigate }: StepIndicatorProps) {
  return (
    <nav aria-label="進捗ステップ" className="mb-4 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 rounded-xl border border-student-border-primary bg-student-bg-secondary px-3 py-2">
        {steps.map((step, index) => {
          const isCurrent = step.key === currentKey
          const isCompleted = completedKeys.includes(step.key)
          const isClickable = Boolean(onNavigate && isCompleted && !isCurrent)

          return (
            <li key={step.key} className="flex items-center gap-1">
              {index > 0 && <span className="mx-1 h-px w-4 bg-student-border-primary" aria-hidden />}
              <button
                type="button"
                onClick={() => isClickable && onNavigate?.(step.path)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex h-7 min-w-[44px] items-center justify-center rounded-full px-2 text-xs transition-colors',
                  isCurrent && 'bg-student-text-primary text-black',
                  isCompleted && !isCurrent && 'bg-student-bg-tertiary text-student-text-primary hover:bg-student-bg-elevated',
                  !isCurrent && !isCompleted && 'bg-student-bg-primary text-student-text-disabled'
                )}
                title={step.label}
              >
                {isCompleted && !isCurrent ? '✓' : index + 1}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
