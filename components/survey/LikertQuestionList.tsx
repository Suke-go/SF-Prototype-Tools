'use client'

import type { LikertValue, SurveyLikertQuestion } from '@/lib/survey/definition'
import { LIKERT_SCALE } from '@/lib/survey/definition'

type Props = {
  questions: SurveyLikertQuestion[]
  answers: Record<string, LikertValue>
  onChange: (questionId: string, value: LikertValue) => void
}

export function LikertQuestionList({ questions, answers, onChange }: Props) {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const selected = answers[question.id]
        return (
          <div key={question.id} className="rounded-xl border border-student-border-primary bg-student-bg-secondary p-4">
            <p className="text-sm text-student-text-primary">
              Q{index + 1}. {question.text}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
              {LIKERT_SCALE.map((scale) => (
                <button
                  key={scale.value}
                  type="button"
                  onClick={() => onChange(question.id, scale.value)}
                  className={[
                    'rounded-lg border px-3 py-2 text-xs transition-colors',
                    selected === scale.value
                      ? 'border-white bg-white/20 text-white'
                      : 'border-student-border-primary bg-student-bg-primary text-student-text-tertiary hover:border-white/40',
                  ].join(' ')}
                >
                  <span className="font-mono">{scale.value}</span>
                  <span className="ml-2">{scale.label}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
