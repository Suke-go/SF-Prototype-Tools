import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '管理画面 | SFプロトタイピング',
  description: 'SFプロトタイピング教育プラットフォーム — 教員管理画面',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-surface min-h-screen bg-admin-bg-primary text-admin-text-primary">
      {children}
    </div>
  )
}
