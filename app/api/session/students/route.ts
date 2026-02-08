import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'

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
      select: {
        id: true,
        themeId: true,
        selectableThemes: {
          select: { themeId: true },
        },
      },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションを参照する権限がありません' } },
        { status: 403 }
      )
    }

    const allowedThemeIds =
      session.selectableThemes.length > 0 ? session.selectableThemes.map((entry) => entry.themeId) : [session.themeId]

    const questionCount = await prisma.question.count({
      where: { themeId: { in: allowedThemeIds } },
    })

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
        _count: { select: { responses: true } },
      },
    })

    const stats = {
      total: students.length,
      notStarted: students.filter((student) => student.progressStatus === 'NOT_STARTED').length,
      bigFive: students.filter((student) => student.progressStatus === 'BIG_FIVE').length,
      themeSelection: students.filter((student) => student.progressStatus === 'THEME_SELECTION').length,
      briefing: students.filter((student) => student.progressStatus === 'BRIEFING').length,
      questions: students.filter((student) => student.progressStatus === 'QUESTIONS').length,
      completed: students.filter((student) => student.progressStatus === 'COMPLETED').length,
      questionCount,
    }

    const bfStudents = students.filter((student) => student.bigFiveResult)
    const bigFiveAvg =
      bfStudents.length > 0
        ? {
            extraversion:
              Math.round(
                (bfStudents.reduce((sum, student) => sum + (student.bigFiveResult?.extraversion ?? 0), 0) /
                  bfStudents.length) *
                  10
              ) / 10,
            agreeableness:
              Math.round(
                (bfStudents.reduce((sum, student) => sum + (student.bigFiveResult?.agreeableness ?? 0), 0) /
                  bfStudents.length) *
                  10
              ) / 10,
            conscientiousness:
              Math.round(
                (bfStudents.reduce((sum, student) => sum + (student.bigFiveResult?.conscientiousness ?? 0), 0) /
                  bfStudents.length) *
                  10
              ) / 10,
            neuroticism:
              Math.round(
                (bfStudents.reduce((sum, student) => sum + (student.bigFiveResult?.neuroticism ?? 0), 0) /
                  bfStudents.length) *
                  10
              ) / 10,
            openness:
              Math.round(
                (bfStudents.reduce((sum, student) => sum + (student.bigFiveResult?.openness ?? 0), 0) /
                  bfStudents.length) *
                  10
              ) / 10,
          }
        : null

    return NextResponse.json({
      success: true,
      data: {
        students: students.map((student) => ({
          id: student.id,
          name: student.name,
          progressStatus: student.progressStatus,
          joinedAt: student.joinedAt.toISOString(),
          lastAccessAt: student.lastAccessAt.toISOString(),
          bigFive: student.bigFiveResult,
          responseCount: student._count.responses,
        })),
        stats,
        bigFiveAvg,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('Session students fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '学生情報の取得に失敗しました' } },
      { status: 500 }
    )
  }
}
