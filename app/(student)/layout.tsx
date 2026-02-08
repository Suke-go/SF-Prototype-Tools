import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'セッション | SFプロトタイピング',
  description: 'SFプロトタイピング教育プラットフォーム — 生徒用セッション画面',
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="student-surface min-h-screen bg-student-bg-primary text-student-text-primary">
      {children}
    </div>
  )
}
