import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext } from '@/lib/middleware/auth'

// セッション内の全回答データを取得（可視化用）
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    const sessionId = new URL(request.url).searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    if (sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'セッションが一致しません' } },
        { status: 403 }
      )
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, themeId: true },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    // テーマの質問を順番に取得
    const questions = await prisma.question.findMany({
      where: { themeId: session.themeId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true, questionText: true },
    })

    // セッション内の全学生
    const students = await prisma.student.findMany({
      where: { sessionId },
      select: {
        id: true,
        name: true,
        progressStatus: true,
        bigFiveResult: {
          select: {
            extraversion: true,
            agreeableness: true,
            conscientiousness: true,
            neuroticism: true,
            openness: true,
          },
        },
      },
    })

    // 全回答
    const responses = await prisma.studentResponse.findMany({
      where: { sessionId },
      select: {
        studentId: true,
        questionId: true,
        responseValue: true,
      },
    })

    // 学生ごとの回答マップ { studentId: { questionId: value } }
    const responseMap: Record<string, Record<string, string>> = {}
    for (const r of responses) {
      if (!responseMap[r.studentId]) responseMap[r.studentId] = {}
      responseMap[r.studentId][r.questionId] = r.responseValue
    }

    // 25次元ベクトルを構築（20問 + 5 Big Five）
    const vectors: { studentId: string; name: string | null; vector: number[] }[] = []

    for (const student of students) {
      const qVector = questions.map((q) => {
        const val = responseMap[student.id]?.[q.id]
        if (val === 'YES') return 1
        if (val === 'NO') return -1
        return 0 // UNKNOWN or missing
      })

      const bf = student.bigFiveResult
      const bfVector = bf
        ? [bf.extraversion, bf.agreeableness, bf.conscientiousness, bf.neuroticism, bf.openness]
        : [0, 0, 0, 0, 0]

      vectors.push({
        studentId: student.id,
        name: student.name,
        vector: [...qVector, ...bfVector],
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        questions: questions.map((q) => ({ id: q.id, order: q.order, text: q.questionText })),
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
          progressStatus: s.progressStatus,
          bigFive: s.bigFiveResult,
        })),
        vectors,
        responseMap,
      },
    })
  } catch (error) {
    console.error('Session responses fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
