'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function QuestionsCompletePage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId
  const router = useRouter()
  const searchParams = useSearchParams()
  const sentRef = useRef(false)
  const themeId = searchParams.get('themeId') || ''

  useEffect(() => {
    if (sentRef.current) return
    sentRef.current = true

    void fetch('/api/session/progress/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {
      // Keep UI non-blocking even if completion sync fails.
    })
  }, [sessionId])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: '#0a0a0a' }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        {/* Animated checkmark */}
        <div
          className="relative"
          style={{ animation: 'completeFloatUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 120,
              height: 120,
              background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
              animation: 'completePulse 3s ease-in-out infinite',
            }}
          />

          {/* SVG animated check */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="relative">
            <circle
              cx="40" cy="40" r="36"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1.5"
              fill="none"
              style={{
                strokeDasharray: 226,
                strokeDashoffset: 226,
                animation: 'completeCircleDraw 0.8s ease-out 0.2s forwards',
              }}
            />
            <circle
              cx="40" cy="40" r="36"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: 226,
                strokeDashoffset: 226,
                animation: 'completeCircleDraw 0.8s ease-out 0.2s forwards',
              }}
            />
            <path
              d="M26 40 L36 50 L54 32"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                strokeDasharray: 40,
                strokeDashoffset: 40,
                animation: 'completeCheckDraw 0.4s ease-out 0.8s forwards',
              }}
            />
          </svg>
        </div>

        {/* Text content */}
        <div style={{ animation: 'completeFloatUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
          <p
            className="mt-8 text-[10px] font-medium uppercase tracking-[0.3em]"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            Complete
          </p>
          <h1
            className="mt-3 font-heading text-2xl font-bold"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            回答が完了しました
          </h1>
          <p
            className="mx-auto mt-4 max-w-[280px] text-sm leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            あなたの回答は保存されました。
            <br />
            次のページで、クラス全体の傾向と
            <br />
            自分の位置を見比べられます。
          </p>
        </div>

        {/* CTA */}
        <div
          className="mt-10 w-full"
          style={{ animation: 'completeFloatUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both' }}
        >
          <button
            onClick={() => {
              const next = themeId
                ? `/student/session/${encodeURIComponent(sessionId)}/visualization?themeId=${encodeURIComponent(themeId)}`
                : `/student/session/${encodeURIComponent(sessionId)}/visualization`
              router.push(next)
            }}
            className="group relative w-full overflow-hidden rounded-2xl px-8 py-4 text-sm font-semibold transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              みんなの考えマップを見る
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          <button
            onClick={() => {
              const next = themeId
                ? `/student/session/${encodeURIComponent(sessionId)}/questions?themeId=${encodeURIComponent(themeId)}`
                : `/student/session/${encodeURIComponent(sessionId)}/questions`
              router.push(next)
            }}
            className="mt-4 text-xs transition-colors duration-200"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
          >
            回答を見直す
          </button>
        </div>

        {/* Compact step progress */}
        <div
          className="mt-12 flex items-center gap-1.5"
          style={{ animation: 'completeFloatUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both' }}
        >
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className="rounded-full"
              style={{
                width: step <= 4 ? 6 : 5,
                height: step <= 4 ? 6 : 5,
                background: step <= 4
                  ? 'rgba(255,255,255,0.5)'
                  : step === 5
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(255,255,255,0.08)',
                border: step === 5 ? '1px solid rgba(255,255,255,0.4)' : 'none',
              }}
            />
          ))}
          <span
            className="ml-2 text-[10px]"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            5 / 6
          </span>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes completeFloatUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes completeCircleDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes completeCheckDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes completePulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }
      `}</style>
    </main>
  )
}
