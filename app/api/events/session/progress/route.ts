import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// SSE: セッション進捗のリアルタイムストリーミング
export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 })
  }

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // 初回送信
      await sendProgress(controller)

      // 5秒ごとにポーリング
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }
        try {
          await sendProgress(controller)
        } catch {
          clearInterval(interval)
          controller.close()
        }
      }, 5000)

      // クライアント切断時
      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(interval)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  async function sendProgress(controller: ReadableStreamDefaultController) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId! },
        select: { id: true, status: true, themeId: true },
      })
      if (!session) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'SESSION_NOT_FOUND' })}\n\n`))
        return
      }

      const questionCount = await prisma.question.count({
        where: { themeId: session.themeId },
      })

      const students = await prisma.student.findMany({
        where: { sessionId: sessionId! },
        select: {
          id: true,
          progressStatus: true,
          _count: { select: { responses: true } },
        },
      })

      const stats = {
        sessionStatus: session.status,
        total: students.length,
        notStarted: students.filter((s) => s.progressStatus === 'NOT_STARTED').length,
        bigFive: students.filter((s) => s.progressStatus === 'BIG_FIVE').length,
        themeSelection: students.filter((s) => s.progressStatus === 'THEME_SELECTION').length,
        questions: students.filter((s) => s.progressStatus === 'QUESTIONS').length,
        completed: students.filter((s) => s.progressStatus === 'COMPLETED').length,
        questionCount,
        totalResponses: students.reduce((s, st) => s + st._count.responses, 0),
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
