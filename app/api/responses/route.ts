import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireStudent } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

const saveResponseSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  responseValue: z.enum(['YES', 'NO', 'UNKNOWN']),
})

export async function POST(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const body = await request.json()
    const validated = saveResponseSchema.parse(body)

    if (validated.sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'トークンと回答対象が一致しません' } },
        { status: 403 }
      )
    }

    const studentId = auth.studentId!

    const session = await prisma.session.findUnique({
      where: { id: validated.sessionId },
      select: {
        id: true,
        themeId: true,
        schoolId: true,
        selectableThemes: {
          select: { themeId: true },
        },
      },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }
    if (session.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '学校が一致しないためアクセスできません' } },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, sessionId: true, schoolId: true },
    })
    if (!student || student.sessionId !== validated.sessionId || student.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'STUDENT_NOT_FOUND', message: '生徒が見つかりません' } },
        { status: 404 }
      )
    }

    const question = await prisma.question.findUnique({
      where: { id: validated.questionId },
      select: { id: true, themeId: true },
    })
    if (!question) {
      return NextResponse.json(
        { success: false, error: { code: 'QUESTION_NOT_FOUND', message: '設問が見つかりません' } },
        { status: 404 }
      )
    }

    const allowedThemeIds =
      session.selectableThemes.length > 0 ? session.selectableThemes.map((entry) => entry.themeId) : [session.themeId]
    if (!allowedThemeIds.includes(question.themeId)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションで利用できない設問です' } },
        { status: 403 }
      )
    }

    const response = await prisma.studentResponse.upsert({
      where: {
        studentId_questionId: {
          studentId,
          questionId: validated.questionId,
        },
      },
      create: {
        studentId,
        sessionId: validated.sessionId,
        questionId: validated.questionId,
        responseValue: validated.responseValue,
      },
      update: {
        responseValue: validated.responseValue,
        answeredAt: new Date(),
      },
    })

    await prisma.student.update({
      where: { id: studentId },
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Response save error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '回答保存に失敗しました' } },
      { status: 500 }
    )
  }
}
