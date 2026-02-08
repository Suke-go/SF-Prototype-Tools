import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let auth
  try {
    auth = requireTeacher(await getAuthContext(request))
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
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
  const targetSessionId = sessionId

  const canAccess = await prisma.session.findFirst({
    where: { id: targetSessionId, schoolId: auth.schoolId, teacherId: auth.teacherId },
    select: { id: true },
  })
  if (!canAccess) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'このセッションを参照する権限がありません' } },
      { status: 403 }
    )
  }

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      await sendProgress(controller)
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }
        try {
          await sendProgress(controller)
        } catch {
          clearInterval(interval)
          try {
            controller.close()
          } catch {
            // no-op
          }
        }
      }, 5000)

      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  async function sendProgress(controller: ReadableStreamDefaultController) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: targetSessionId },
        select: {
          id: true,
          status: true,
          themeId: true,
          selectableThemes: {
            select: { themeId: true },
          },
        },
      })
      if (!session) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'SESSION_NOT_FOUND' })}\n\n`))
        return
      }

      const allowedThemeIds =
        session.selectableThemes.length > 0 ? session.selectableThemes.map((entry) => entry.themeId) : [session.themeId]

      const [questionCount, totalStudents, groupedStatuses, totalResponses] = await Promise.all([
        prisma.question.count({
          where: { themeId: { in: allowedThemeIds } },
        }),
        prisma.student.count({
          where: { sessionId: targetSessionId },
        }),
        prisma.student.groupBy({
          by: ['progressStatus'],
          where: { sessionId: targetSessionId },
          _count: { _all: true },
        }),
        prisma.studentResponse.count({
          where: { sessionId: targetSessionId },
        }),
      ])

      const statusCounts = groupedStatuses.reduce<Record<string, number>>((acc, row) => {
        acc[row.progressStatus] = row._count._all
        return acc
      }, {})

      const stats = {
        sessionStatus: session.status,
        total: totalStudents,
        notStarted: statusCounts.NOT_STARTED ?? 0,
        bigFive: statusCounts.BIG_FIVE ?? 0,
        themeSelection: statusCounts.THEME_SELECTION ?? 0,
        briefing: statusCounts.BRIEFING ?? 0,
        questions: statusCounts.QUESTIONS ?? 0,
        completed: statusCounts.COMPLETED ?? 0,
        questionCount,
        totalResponses,
        timestamp: new Date().toISOString(),
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`))
    } catch (error) {
      console.error('SSE progress error:', error)
    }
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
