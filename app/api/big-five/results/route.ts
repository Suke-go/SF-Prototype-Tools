import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveBigFiveSchema } from '@/lib/validations/bigfive'
import { computeBigFiveScores } from '@/lib/bigfive/scoring'
import { getAuthContext, requireStudent } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

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
        { success: false, error: { code: 'FORBIDDEN', message: '別セッションの結果にはアクセスできません' } },
        { status: 403 }
      )
    }

    const result = await prisma.bigFiveResult.findUnique({
      where: { studentId: auth.studentId! },
      select: {
        id: true,
        extraversion: true,
        agreeableness: true,
        conscientiousness: true,
        neuroticism: true,
        openness: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { result },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('BigFive fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Big Five結果の取得に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const body = await request.json()
    const validated = saveBigFiveSchema.parse(body)

    if (validated.sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'トークンと結果保存対象が一致しません' } },
        { status: 403 }
      )
    }

    const studentId = auth.studentId!

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

    const existing = await prisma.bigFiveResult.findUnique({
      where: { studentId },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_COMPLETED', message: 'Big Fiveは既に回答済みです' } },
        { status: 409 }
      )
    }

    const answersMap: Record<number, number> = {}
    for (const answer of validated.answers) answersMap[answer.questionNumber] = answer.score
    for (let i = 1; i <= 10; i += 1) {
      if (answersMap[i] === undefined) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_REQUEST', message: `設問${i}の回答が不足しています` } },
          { status: 400 }
        )
      }
    }

    const scores = computeBigFiveScores(answersMap)
    const result = await prisma.bigFiveResult.create({
      data: {
        studentId,
        ...scores,
      },
    })

    await prisma.student.update({
      where: { id: studentId },
      data: { progressStatus: 'THEME_SELECTION' },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          result: {
            id: result.id,
            ...scores,
            completedAt: result.completedAt.toISOString(),
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
    console.error('BigFive save error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Big Five保存に失敗しました' } },
      { status: 500 }
    )
  }
}
