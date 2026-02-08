import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

export const dynamic = 'force-dynamic'

const questionInputSchema = z.object({
  questionText: z.string().trim().min(1, '設問文を入力してください').max(500, '設問文は500文字以内です'),
  order: z.number().int().min(1).optional(),
})

const createThemeSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(255, 'タイトルは255文字以内です'),
  description: z.string().trim().max(4000, '説明は4000文字以内です').optional().default(''),
  imageUrl: z.string().trim().url('画像URLの形式が不正です').max(2048).optional(),
  worldviewCardId: z.string().trim().max(100).optional(),
  questions: z.array(questionInputSchema).min(1, '設問を1つ以上追加してください').max(50, '設問は50件までです'),
})

function unauthorized(message = 'ログインが必要です') {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    const sessionId = new URL(request.url).searchParams.get('sessionId')
    const statusParam = new URL(request.url).searchParams.get('status')?.toUpperCase()

    if (sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          themeId: true,
          selectableThemes: {
            orderBy: { createdAt: 'asc' },
            select: {
              theme: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  imageUrl: true,
                  worldviewCardId: true,
                  status: true,
                },
              },
            },
          },
        },
      })
      if (!session) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'セッションが見つかりません' } },
          { status: 404 }
        )
      }

      const mappedThemes = session.selectableThemes.map((entry) => entry.theme)
      if (mappedThemes.length > 0) {
        return NextResponse.json({
          success: true,
          data: { themes: mappedThemes },
        })
      }

      const fallbackTheme = await prisma.theme.findUnique({
        where: { id: session.themeId },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          worldviewCardId: true,
          status: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: { themes: fallbackTheme ? [fallbackTheme] : [] },
      })
    }

    const where =
      statusParam === 'ACTIVE' || statusParam === 'INACTIVE'
        ? { status: statusParam as 'ACTIVE' | 'INACTIVE' }
        : statusParam === 'ALL'
          ? {}
          : auth?.role === 'teacher'
            ? {}
            : { status: 'ACTIVE' as const }

    const themes = await prisma.theme.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        worldviewCardId: true,
        status: true,
        questions: {
          select: {
            id: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        themes: themes.map((theme) => ({
          id: theme.id,
          title: theme.title,
          description: theme.description,
          imageUrl: theme.imageUrl,
          worldviewCardId: theme.worldviewCardId,
          status: theme.status,
          questionCount: theme.questions.length,
        })),
      },
    })
  } catch (error) {
    console.error('Themes fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    requireTeacher(await getAuthContext(request))
    const body = await request.json().catch(() => ({}))
    const input = createThemeSchema.parse(body)

    const normalizedQuestions = input.questions.map((question, index) => ({
      questionText: question.questionText.trim(),
      order: index + 1,
      questionType: 'YES_NO_UNKNOWN' as const,
    }))

    const created = await prisma.$transaction(async (tx) => {
      const theme = await tx.theme.create({
        data: {
          title: input.title,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          worldviewCardId: input.worldviewCardId || null,
          status: 'ACTIVE',
        },
      })
      await tx.question.createMany({
        data: normalizedQuestions.map((question) => ({
          ...question,
          themeId: theme.id,
        })),
      })
      return theme
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          theme: {
            id: created.id,
            title: created.title,
            description: created.description,
            imageUrl: created.imageUrl,
            worldviewCardId: created.worldviewCardId,
            status: created.status,
            questionCount: normalizedQuestions.length,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorized()
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Theme create error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'テーマ作成に失敗しました' } },
      { status: 500 }
    )
  }
}
