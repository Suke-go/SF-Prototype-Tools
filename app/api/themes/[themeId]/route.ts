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

const updateThemeSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(255, 'タイトルは255文字以内です'),
  description: z.string().trim().max(4000, '説明は4000文字以内です').optional().default(''),
  imageUrl: z.string().trim().url('画像URLの形式が不正です').max(2048).optional(),
  worldviewCardId: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  questions: z.array(questionInputSchema).min(1, '設問を1つ以上追加してください').max(50, '設問は50件までです'),
})

function unauthorized(message = 'ログインが必要です') {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 })
}

export async function GET(request: NextRequest, { params }: { params: { themeId: string } }) {
  try {
    const auth = await getAuthContext(request)
    const sessionId = new URL(request.url).searchParams.get('sessionId')
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') === '1'

    if (sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          themeId: true,
          selectableThemes: {
            select: { themeId: true },
          },
        },
      })
      if (!session) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'セッションが見つかりません' } },
          { status: 404 }
        )
      }

      const allowedThemeIds =
        session.selectableThemes.length > 0
          ? session.selectableThemes.map((entry) => entry.themeId)
          : [session.themeId]

      if (!allowedThemeIds.includes(params.themeId)) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'このセッションでは選択できないテーマです' } },
          { status: 403 }
        )
      }
    }

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

    if (!theme || (!includeInactive && auth?.role !== 'teacher' && theme.status !== 'ACTIVE')) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
        { status: 404 }
      )
    }

    const usedInSessions = await prisma.session.count({
      where: {
        OR: [
          { themeId: theme.id },
          {
            selectableThemes: {
              some: {
                themeId: theme.id,
              },
            },
          },
        ],
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        theme: {
          id: theme.id,
          title: theme.title,
          description: theme.description,
          imageUrl: theme.imageUrl,
          worldviewCardId: theme.worldviewCardId,
          status: theme.status,
          usedInSessions,
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

export async function PUT(request: NextRequest, { params }: { params: { themeId: string } }) {
  try {
    requireTeacher(await getAuthContext(request))
    const body = await request.json().catch(() => ({}))
    const input = updateThemeSchema.parse(body)

    const existing = await prisma.theme.findUnique({
      where: { id: params.themeId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
        { status: 404 }
      )
    }

    const normalizedQuestions = input.questions.map((question, index) => ({
      questionText: question.questionText.trim(),
      order: index + 1,
      questionType: 'YES_NO_UNKNOWN' as const,
    }))

    const updated = await prisma.$transaction(async (tx) => {
      const theme = await tx.theme.update({
        where: { id: params.themeId },
        data: {
          title: input.title,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          worldviewCardId: input.worldviewCardId || null,
          ...(input.status ? { status: input.status } : {}),
        },
      })
      await tx.question.deleteMany({ where: { themeId: params.themeId } })
      await tx.question.createMany({
        data: normalizedQuestions.map((question) => ({
          ...question,
          themeId: params.themeId,
        })),
      })
      return theme
    })

    return NextResponse.json({
      success: true,
      data: {
        theme: {
          id: updated.id,
          title: updated.title,
          description: updated.description,
          imageUrl: updated.imageUrl,
          worldviewCardId: updated.worldviewCardId,
          status: updated.status,
          questionCount: normalizedQuestions.length,
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorized()
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Theme update error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'テーマ更新に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { themeId: string } }) {
  try {
    requireTeacher(await getAuthContext(request))
    const existing = await prisma.theme.findUnique({
      where: { id: params.themeId },
      select: { id: true, status: true },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
        { status: 404 }
      )
    }

    const usedInSessions = await prisma.session.count({
      where: {
        OR: [
          { themeId: params.themeId },
          {
            selectableThemes: {
              some: {
                themeId: params.themeId,
              },
            },
          },
        ],
      },
    })

    if (usedInSessions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'THEME_IN_USE',
            message: `このテーマは ${usedInSessions} 件のセッションで使用中のため無効化できません`,
          },
        },
        { status: 409 }
      )
    }

    if (existing.status !== 'INACTIVE') {
      await prisma.theme.update({
        where: { id: params.themeId },
        data: { status: 'INACTIVE' },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        theme: {
          id: params.themeId,
          status: 'INACTIVE',
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorized()
    console.error('Theme delete error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'テーマ削除に失敗しました' } },
      { status: 500 }
    )
  }
}
