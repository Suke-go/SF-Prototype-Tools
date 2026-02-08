import Link from 'next/link'

export default function Home() {
  return (
    <main className="matte-texture relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        <div className="float-up">
          <p className="mb-5 font-mono text-xs tracking-[0.3em] text-student-text-tertiary">FUTURE CLASSROOM TOOL</p>
          <h1 className="font-heading text-4xl font-bold leading-[1.3] tracking-tight text-student-text-primary md:text-5xl">
            未来社会を考える
            <br />
            学習セッション
          </h1>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-student-text-tertiary">
            生徒は設問に回答し、教員は進捗と結果を管理できます。公開テーマを事前に確認してから授業を始められます。
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 fade-in" style={{ animationDelay: '200ms' }}>
          <Link
            href="/student"
            className="group flex w-full max-w-xs items-center justify-center gap-3 rounded-xl border border-student-border-primary bg-student-bg-tertiary px-8 py-4 text-base font-medium text-student-text-primary transition-all duration-normal hover:border-white/20 hover:bg-student-bg-elevated"
          >
            <span>セッションに参加</span>
            <span className="text-student-text-tertiary transition-transform duration-normal group-hover:translate-x-1">→</span>
          </Link>

          <div className="flex items-center gap-4 text-sm text-student-text-tertiary">
            <Link className="transition-colors duration-normal hover:text-student-text-secondary" href="/admin">
              教員ログイン
            </Link>
            <span>|</span>
            <Link className="transition-colors duration-normal hover:text-student-text-secondary" href="/explore">
              公開テーマを見る
            </Link>
          </div>
        </div>

        <div className="mt-16 fade-in" style={{ animationDelay: '400ms' }}>
          <div className="inline-flex items-center gap-3 rounded-full border border-student-border-secondary px-4 py-2 text-xs text-student-text-disabled">
            <span className="h-1.5 w-1.5 rounded-full bg-student-text-disabled" />
            <span className="font-mono tracking-wider">学習支援</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-student-text-disabled">
            <Link href="/privacy" className="transition-colors hover:text-student-text-tertiary">
              プライバシーポリシー
            </Link>
            <span>|</span>
            <Link href="/terms" className="transition-colors hover:text-student-text-tertiary">
              利用規約
            </Link>
            <span>|</span>
            <Link href="/explore" className="transition-colors hover:text-student-text-tertiary">
              公開テーマ
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
