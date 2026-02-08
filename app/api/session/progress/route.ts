import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, requireStudent } from '@/lib/middleware/auth'
import { prisma } from '@/lib/prisma'

function nextPath(sessionId: string, progressStatus: string) {
  switch (progressStatus) {
    case 'BIG_FIVE':
    case 'NOT_STARTED':
      return `/student/session/${sessionId}/big-five`
    case 'THEME_SELECTION':
      return `/student/session/${sessionId}/themes`
    case 'BRIEFING':
      return `/student/session/${sessionId}/briefing`
    case 'QUESTIONS':
      return `/student/session/${sessionId}/questions`
    case 'COMPLETED':
      return `/student/session/${sessionId}/visualization`
    default:
      return `/student/session/${sessionId}/big-five`
  }
}

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
        { success: false, error: { code: 'FORBIDDEN', message: '別セッションにはアクセスできません' } },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: auth.studentId },
      select: { id: true, sessionId: true, schoolId: true, progressStatus: true },
    })
    if (!student || student.sessionId !== sessionId || student.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '生徒情報が一致しません' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        studentId: student.id,
        progressStatus: student.progressStatus,
        nextPath: nextPath(sessionId, student.progressStatus),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('Session progress fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '進捗の取得に失敗しました' } },
      { status: 500 }
    )
  }
}
