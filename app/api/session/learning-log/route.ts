import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireStudent } from '@/lib/middleware/auth'
import { MOONSHOT_GOAL_KEYS } from '@/lib/moonshot/goals'
import { zodErrorResponse } from '@/lib/api/zod-error'

const saveLearningLogSchema = z.object({
  sessionId: z.string().uuid(),
  goalKey: z
    .string()
    .refine((value) => MOONSHOT_GOAL_KEYS.includes(value), { message: 'goalKeyが不正です' }),
  reflection: z.string().trim().min(1, '記述は必須です').max(2000, '2000文字以内で入力してください'),
})

export async function GET(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const sessionId = new URL(request.url).searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }
    if (sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '他セッションにはアクセスできません' } },
        { status: 403 }
      )
    }

    const logs = await prisma.learningLog.findMany({
      where: {
        sessionId,
        studentId: auth.studentId,
      },
      select: {
        id: true,
        goalKey: true,
        reflection: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((log) => ({
          id: log.id,
          goalKey: log.goalKey,
          reflection: log.reflection,
          updatedAt: log.updatedAt.toISOString(),
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
    console.error('Learning log fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '学習ログ取得に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const body = await request.json()
    const input = saveLearningLogSchema.parse(body)

    if (input.sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '他セッションには保存できません' } },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: auth.studentId },
      select: { id: true, sessionId: true, schoolId: true },
    })
    if (!student || student.sessionId !== input.sessionId || student.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'STUDENT_NOT_FOUND', message: '学生が見つかりません' } },
        { status: 404 }
      )
    }

    const log = await prisma.learningLog.upsert({
      where: {
        studentId_goalKey: {
          studentId: student.id,
          goalKey: input.goalKey,
        },
      },
      create: {
        sessionId: input.sessionId,
        studentId: student.id,
        goalKey: input.goalKey,
        reflection: input.reflection,
      },
      update: {
        reflection: input.reflection,
      },
    })

    await prisma.student.update({
      where: { id: student.id },
      data: {
        progressStatus: 'BRIEFING',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        log: {
          id: log.id,
          goalKey: log.goalKey,
          reflection: log.reflection,
          updatedAt: log.updatedAt.toISOString(),
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
    console.error('Learning log save error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '学習ログ保存に失敗しました' } },
      { status: 500 }
    )
  }
}
