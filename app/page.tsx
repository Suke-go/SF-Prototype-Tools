import Link from 'next/link'

export default function Home() {
  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* 背景のアンビエント演出 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        {/* タイトル */}
        <div className="float-up">
          <p className="mb-5 font-mono text-xs tracking-[0.3em] text-student-text-tertiary">
            SELF-DISCOVERY × SF PROTOTYPING
          </p>
          <h1 className="font-heading text-4xl font-bold leading-[1.3] tracking-tight text-student-text-primary md:text-5xl">
            あなたの意見が、
            <br />
            未来の地図になる。
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-student-text-tertiary">
            性格診断と未来社会への問いを通じて、あなた自身の思考の輪郭を探る。
            集団の中での自分の立ち位置が、意見マップとして可視化されます。
          </p>
        </div>

        {/* CTAエリア */}
        <div className="mt-12 flex flex-col items-center gap-4 fade-in" style={{ animationDelay: '200ms' }}>
          <Link
            href="/student"
            className="group flex w-full max-w-xs items-center justify-center gap-3 rounded-xl border border-student-border-primary bg-student-bg-tertiary px-8 py-4 text-base font-medium text-student-text-primary transition-all duration-normal hover:border-white/20 hover:bg-student-bg-elevated"
          >
            <span>セッションに参加</span>
            <span className="text-student-text-tertiary transition-transform duration-normal group-hover:translate-x-1">→</span>
          </Link>

          <Link
            href="/admin"
            className="text-sm text-student-text-tertiary transition-colors duration-normal hover:text-student-text-secondary"
          >
            管理者としてログイン
          </Link>
        </div>

        {/* フッタ情報 */}
        <div className="mt-16 fade-in" style={{ animationDelay: '400ms' }}>
          <div className="inline-flex items-center gap-3 rounded-full border border-student-border-secondary px-4 py-2 text-xs text-student-text-disabled">
            <span className="h-1.5 w-1.5 rounded-full bg-student-text-disabled" />
            <span className="font-mono tracking-wider">PROTOTYPE</span>
          </div>
        </div>
      </div>
    </main>
  )
}
