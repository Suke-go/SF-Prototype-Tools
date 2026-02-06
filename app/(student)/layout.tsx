import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SFプロトタイピング | 生徒',
  description: '自分探し×SFプロトタイピング×集団の意見の可視化',
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-student-bg-primary text-student-text-primary">
      {children}
    </div>
  )
}
