import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// セッションデータをJSON/CSV形式でエクスポート
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const format = url.searchParams.get('format') || 'json'

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        theme: true,
      },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    const questions = await prisma.question.findMany({
      where: { themeId: session.themeId },
      orderBy: { order: 'asc' },
    })

    const students = await prisma.student.findMany({
      where: { sessionId },
      include: {
        bigFiveResult: true,
        responses: true,
      },
    })

    if (format === 'csv') {
      // CSV形式
      const header = [
        'studentId',
        'name',
        'progressStatus',
        'extraversion',
        'agreeableness',
        'conscientiousness',
        'neuroticism',
        'openness',
        ...questions.map((q) => `Q${q.order}`),
      ].join(',')

      const rows = students.map((s) => {
        const bf = s.bigFiveResult
        const responseMap: Record<string, string> = {}
        for (const r of s.responses) {
          responseMap[r.questionId] = r.responseValue
        }
        return [
          s.id,
          s.name || '匿名',
          s.progressStatus,
          bf?.extraversion ?? '',
          bf?.agreeableness ?? '',
          bf?.conscientiousness ?? '',
          bf?.neuroticism ?? '',
          bf?.openness ?? '',
          ...questions.map((q) => responseMap[q.id] || ''),
        ].join(',')
      })

      const csv = [header, ...rows].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="session_${sessionId.slice(0, 8)}.csv"`,
        },
      })
    }

    // JSON形式
    const exportData = {
      session: {
        id: session.id,
        title: session.title,
        theme: session.theme.title,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
      questions: questions.map((q) => ({
        id: q.id,
        order: q.order,
        text: q.questionText,
      })),
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        progressStatus: s.progressStatus,
        bigFive: s.bigFiveResult
          ? {
              extraversion: s.bigFiveResult.extraversion,
              agreeableness: s.bigFiveResult.agreeableness,
              conscientiousness: s.bigFiveResult.conscientiousness,
              neuroticism: s.bigFiveResult.neuroticism,
              openness: s.bigFiveResult.openness,
            }
          : null,
        responses: s.responses.map((r) => ({
          questionId: r.questionId,
          value: r.responseValue,
          answeredAt: r.answeredAt.toISOString(),
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
    console.error('Export error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
