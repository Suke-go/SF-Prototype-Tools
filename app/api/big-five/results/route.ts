import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveBigFiveSchema } from '@/lib/validations/bigfive'
import { computeBigFiveScores } from '@/lib/bigfive/scoring'
import { getAuthContext } from '@/lib/middleware/auth'

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
    const validated = saveBigFiveSchema.parse(body)

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

    // answersを { [n]: score } に変換
    const answersMap: Record<number, number> = {}
    for (const a of validated.answers) answersMap[a.questionNumber] = a.score

    // 必須10問チェック
    for (let i = 1; i <= 10; i++) {
      if (answersMap[i] === undefined) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_REQUEST', message: `質問${i}の回答が不足しています` } },
          { status: 400 }
        )
      }
    }

    const scores = computeBigFiveScores(answersMap)

    // 学生の更新（join API で作成済み前提）
    const student = await prisma.student.findUnique({ where: { id: validated.studentId } })
    if (!student || student.sessionId !== validated.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'STUDENT_NOT_FOUND', message: '学生が見つかりません' } },
        { status: 404 }
      )
    }
    await prisma.student.update({
      where: { id: validated.studentId },
      data: { progressStatus: 'THEME_SELECTION' },
    })

    // BigFiveResult upsert（studentId unique）
    const result = await prisma.bigFiveResult.upsert({
      where: { studentId: validated.studentId },
      create: {
        studentId: validated.studentId,
        ...scores,
      },
      update: {
        ...scores,
        completedAt: new Date(),
      },
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
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'バリデーションエラー', details: error } },
        { status: 400 }
      )
    }

    console.error('BigFive save error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

