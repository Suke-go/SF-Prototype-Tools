import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// セッション内の学生一覧を取得（管理者ダッシュボード用）
export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
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

    // 質問数を取得
    const questionCount = await prisma.question.count({
      where: { themeId: session.themeId },
    })

    // 学生一覧（Big Five + 回答数）
    const students = await prisma.student.findMany({
      where: { sessionId },
      orderBy: { joinedAt: 'desc' },
      select: {
        id: true,
        name: true,
        progressStatus: true,
        joinedAt: true,
        lastAccessAt: true,
        bigFiveResult: {
          select: {
            extraversion: true,
            agreeableness: true,
            conscientiousness: true,
            neuroticism: true,
            openness: true,
          },
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    })

    // 進捗統計
    const stats = {
      total: students.length,
      notStarted: students.filter((s) => s.progressStatus === 'NOT_STARTED').length,
      bigFive: students.filter((s) => s.progressStatus === 'BIG_FIVE').length,
      themeSelection: students.filter((s) => s.progressStatus === 'THEME_SELECTION').length,
      questions: students.filter((s) => s.progressStatus === 'QUESTIONS').length,
      completed: students.filter((s) => s.progressStatus === 'COMPLETED').length,
      questionCount,
    }

    // Big Five平均
    const bfStudents = students.filter((s) => s.bigFiveResult)
    const bigFiveAvg = bfStudents.length > 0
      ? {
          extraversion: Math.round((bfStudents.reduce((s, st) => s + (st.bigFiveResult?.extraversion ?? 0), 0) / bfStudents.length) * 10) / 10,
          agreeableness: Math.round((bfStudents.reduce((s, st) => s + (st.bigFiveResult?.agreeableness ?? 0), 0) / bfStudents.length) * 10) / 10,
          conscientiousness: Math.round((bfStudents.reduce((s, st) => s + (st.bigFiveResult?.conscientiousness ?? 0), 0) / bfStudents.length) * 10) / 10,
          neuroticism: Math.round((bfStudents.reduce((s, st) => s + (st.bigFiveResult?.neuroticism ?? 0), 0) / bfStudents.length) * 10) / 10,
          openness: Math.round((bfStudents.reduce((s, st) => s + (st.bigFiveResult?.openness ?? 0), 0) / bfStudents.length) * 10) / 10,
        }
      : null

    return NextResponse.json({
      success: true,
      data: {
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
          progressStatus: s.progressStatus,
          joinedAt: s.joinedAt.toISOString(),
          lastAccessAt: s.lastAccessAt.toISOString(),
          bigFive: s.bigFiveResult,
          responseCount: s._count.responses,
        })),
        stats,
        bigFiveAvg,
      },
    })
  } catch (error) {
    console.error('Session students fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
