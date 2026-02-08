import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

const saveReviewSchema = z.object({
  learningLogId: z.string().uuid(),
  rubricUnderstanding: z.number().int().min(1).max(4),
  rubricEvidence: z.number().int().min(1).max(4),
  rubricDialogue: z.number().int().min(1).max(4),
  comment: z.string().trim().max(2000).optional().default(''),
})

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const sessionId = new URL(request.url).searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, schoolId: auth.schoolId, teacherId: auth.teacherId },
      select: { id: true },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションを参照する権限がありません' } },
        { status: 403 }
      )
    }

    const logs = await prisma.learningLog.findMany({
      where: { sessionId },
      orderBy: [{ goalKey: 'asc' }, { updatedAt: 'desc' }],
      include: {
        student: {
          select: {
            id: true,
            name: true,
            progressStatus: true,
          },
        },
        review: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          goalKey: log.goalKey,
          reflection: log.reflection,
          updatedAt: log.updatedAt.toISOString(),
          student: log.student,
          review: log.review
            ? {
              id: log.review.id,
              rubricUnderstanding: log.review.rubricUnderstanding,
              rubricEvidence: log.review.rubricEvidence,
              rubricDialogue: log.review.rubricDialogue,
              comment: log.review.comment,
              updatedAt: log.review.updatedAt.toISOString(),
            }
            : null,
        })),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('Review fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'レビュー一覧取得に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const body = await request.json()
    const input = saveReviewSchema.parse(body)

    const log = await prisma.learningLog.findUnique({
      where: { id: input.learningLogId },
      include: {
        session: {
          select: {
            id: true,
            schoolId: true,
            teacherId: true,
          },
        },
      },
    })
    if (!log) {
      return NextResponse.json(
        { success: false, error: { code: 'LOG_NOT_FOUND', message: '学習ログが見つかりません' } },
        { status: 404 }
      )
    }
    if (log.session.schoolId !== auth.schoolId || log.session.teacherId !== auth.teacherId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'この学習ログを評価する権限がありません' } },
        { status: 403 }
      )
    }

    const review = await prisma.learningReview.upsert({
      where: { learningLogId: input.learningLogId },
      create: {
        learningLogId: input.learningLogId,
        teacherId: auth.teacherId!,
        rubricUnderstanding: input.rubricUnderstanding,
        rubricEvidence: input.rubricEvidence,
        rubricDialogue: input.rubricDialogue,
        comment: input.comment || null,
      },
      update: {
        rubricUnderstanding: input.rubricUnderstanding,
        rubricEvidence: input.rubricEvidence,
        rubricDialogue: input.rubricDialogue,
        comment: input.comment || null,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        review: {
          id: review.id,
          rubricUnderstanding: review.rubricUnderstanding,
          rubricEvidence: review.rubricEvidence,
          rubricDialogue: review.rubricDialogue,
          comment: review.comment,
          updatedAt: review.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Review save error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'レビュー保存に失敗しました' } },
      { status: 500 }
    )
  }
}
