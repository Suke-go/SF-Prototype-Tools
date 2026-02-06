'use client'

import { Button } from '@/components/ui'

export default function QuestionsCompletePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId

  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center px-6">
      {/* 背景のアンビエント */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="float-up">
          {/* 完了マーク */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-student-border-primary bg-student-bg-tertiary">
            <span className="text-2xl text-student-text-primary">✓</span>
          </div>

          <p className="mt-6 font-mono text-xs tracking-[0.2em] text-student-text-disabled">RESPONSES RECORDED</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-student-text-primary">
            回答が完了しました
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-student-text-tertiary">
            すべての質問に回答しました。<br />
            あなたの意見がクラス全体のマップに反映されます。
          </p>
        </div>

        <div className="mt-10 space-y-3 fade-in" style={{ animationDelay: '300ms' }}>
          <Button
            onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}/visualization`)}
            className="w-full rounded-xl py-4 text-base"
          >
            意見マップを見る
          </Button>
          <button
            onClick={() => (window.location.href = `/student/session/${encodeURIComponent(sessionId)}`)}
            className="text-xs text-student-text-disabled transition-colors hover:text-student-text-tertiary"
          >
            セッションに戻る
          </button>
        </div>
      </div>
    </main>
  )
}
