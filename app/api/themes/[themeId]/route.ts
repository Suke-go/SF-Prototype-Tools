import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { themeId: string } }
) {
  try {
    const theme = await prisma.theme.findUnique({
      where: { id: params.themeId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            questionText: true,
            order: true,
          },
        },
      },
    })

    if (!theme) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        theme: {
          id: theme.id,
          title: theme.title,
          description: theme.description,
          imageUrl: theme.imageUrl,
          questions: theme.questions,
        },
      },
    })
  } catch (error) {
    console.error('Theme detail fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
