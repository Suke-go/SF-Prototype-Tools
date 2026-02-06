import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ISR: テーマ一覧は60秒キャッシュ（変更頻度が低い）
export const revalidate = 60

export async function GET() {
  try {
    const themes = await prisma.theme.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        status: true,
      },
    })

    return NextResponse.json({ success: true, data: { themes } })
  } catch (error) {
    console.error('Themes fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

