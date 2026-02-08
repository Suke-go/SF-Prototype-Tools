import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const format = url.searchParams.get('format') || 'json'

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    const session = await prisma.session.findFirst({
      where: { id: sessionId, schoolId: auth.schoolId, teacherId: auth.teacherId },
      include: {
        theme: true,
        selectableThemes: {
          orderBy: { createdAt: 'asc' },
          include: {
            theme: true,
          },
        },
      },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションをエクスポートする権限がありません' } },
        { status: 403 }
      )
    }

    const allowedThemeIds =
      session.selectableThemes.length > 0 ? session.selectableThemes.map((entry) => entry.themeId) : [session.themeId]
    const themeOrderMap = new Map(allowedThemeIds.map((themeId, index) => [themeId, index] as const))

    const questions = await prisma.question.findMany({
      where: { themeId: { in: allowedThemeIds } },
      select: { id: true, order: true, questionText: true, themeId: true },
    })
    questions.sort((a, b) => {
      const themeDiff = (themeOrderMap.get(a.themeId) ?? 999) - (themeOrderMap.get(b.themeId) ?? 999)
      if (themeDiff !== 0) return themeDiff
      return a.order - b.order
    })

    const students = await prisma.student.findMany({
      where: { sessionId },
      include: {
        bigFiveResult: true,
        responses: true,
      },
    })

    if (format === 'csv') {
      const header = [
        'studentId',
        'name',
        'progressStatus',
        'extraversion',
        'agreeableness',
        'conscientiousness',
        'neuroticism',
        'openness',
        ...questions.map((question, index) => `Q${index + 1}`),
      ].join(',')

      const rows = students.map((student) => {
        const bf = student.bigFiveResult
        const responseMap: Record<string, string> = {}
        for (const response of student.responses) responseMap[response.questionId] = response.responseValue

        return [
          student.id,
          student.name || '匿名',
          student.progressStatus,
          bf?.extraversion?.toString() ?? '',
          bf?.agreeableness?.toString() ?? '',
          bf?.conscientiousness?.toString() ?? '',
          bf?.neuroticism?.toString() ?? '',
          bf?.openness?.toString() ?? '',
          ...questions.map((question) => responseMap[question.id] || ''),
        ]
          .map(csvEscape)
          .join(',')
      })

      const csv = [header, ...rows].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="session_${sessionId.slice(0, 8)}.csv"`,
        },
      })
    }

    const selectedThemeTitles =
      session.selectableThemes.length > 0
        ? session.selectableThemes.map((entry) => entry.theme.title)
        : [session.theme.title]

    const exportData = {
      session: {
        id: session.id,
        title: session.title,
        sessionCode: session.sessionCode,
        primaryTheme: session.theme.title,
        selectableThemes: selectedThemeTitles,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
      questions: questions.map((question, index) => ({
        id: question.id,
        order: index + 1,
        originalOrder: question.order,
        themeId: question.themeId,
        text: question.questionText,
      })),
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        progressStatus: student.progressStatus,
        bigFive: student.bigFiveResult
          ? {
              extraversion: student.bigFiveResult.extraversion,
              agreeableness: student.bigFiveResult.agreeableness,
              conscientiousness: student.bigFiveResult.conscientiousness,
              neuroticism: student.bigFiveResult.neuroticism,
              openness: student.bigFiveResult.openness,
            }
          : null,
        responses: student.responses.map((response) => ({
          questionId: response.questionId,
          value: response.responseValue,
          answeredAt: response.answeredAt.toISOString(),
        })),
      })),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="session_${sessionId.slice(0, 8)}.json"`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('Export error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'エクスポートに失敗しました' } },
      { status: 500 }
    )
  }
}
