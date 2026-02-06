import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SFプロトタイピング教育プラットフォーム',
  description: '自分探し×SFプロトタイピング×集団の意見の可視化',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
