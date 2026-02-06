import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthContext } from '@/lib/middleware/auth'

const saveResponseSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  questionId: z.string().uuid(),
  responseValue: z.enum(['YES', 'NO', 'UNKNOWN']),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || auth.role !== 'student') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = saveResponseSchema.parse(body)

    if (validated.sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'セッションが一致しません' } },
        { status: 403 }
      )
    }
    if (!auth.studentId || validated.studentId !== auth.studentId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'studentIdが一致しません' } },
        { status: 403 }
      )
    }

    // セッション存在確認
    const session = await prisma.session.findUnique({ where: { id: validated.sessionId } })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    // 学生存在確認（なりすまし/不整合の早期検知）
    const student = await prisma.student.findUnique({ where: { id: validated.studentId } })
    if (!student || student.sessionId !== validated.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'STUDENT_NOT_FOUND', message: '学生が見つかりません' } },
        { status: 404 }
      )
    }

    // 質問存在確認
    const question = await prisma.question.findUnique({ where: { id: validated.questionId } })
    if (!question) {
      return NextResponse.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: '質問が見つかりません' } },
        { status: 404 }
      )
    }

    // 回答を upsert（同一学生・同一質問で1回答のみ）
    const response = await prisma.studentResponse.upsert({
      where: {
        studentId_questionId: {
          studentId: validated.studentId,
          questionId: validated.questionId,
        },
      },
      create: {
        studentId: validated.studentId,
        sessionId: validated.sessionId,
        questionId: validated.questionId,
        responseValue: validated.responseValue,
      },
      update: {
        responseValue: validated.responseValue,
        answeredAt: new Date(),
      },
    })

    // 学生の進捗を更新
    await prisma.student.update({
      where: { id: validated.studentId },
      data: { progressStatus: 'QUESTIONS' },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          response: {
            id: response.id,
            questionId: response.questionId,
            responseValue: response.responseValue,
            answeredAt: response.answeredAt.toISOString(),
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'バリデーションエラー', details: error } },
        { status: 400 }
      )
    }

    console.error('Response save error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
