import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireStudent } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

const completeSchema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const body = await request.json().catch(() => ({}))
    const input = completeSchema.parse(body)

    if (input.sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '別セッションの進捗は更新できません' } },
        { status: 403 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: auth.studentId },
      select: { id: true, sessionId: true, schoolId: true },
    })
    if (!student || student.sessionId !== input.sessionId || student.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'STUDENT_NOT_FOUND', message: '学生情報が見つかりません' } },
        { status: 404 }
      )
    }

    await prisma.student.update({
      where: { id: student.id },
      data: { progressStatus: 'COMPLETED' },
    })

    return NextResponse.json({
      success: true,
      data: { progressStatus: 'COMPLETED' as const },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Complete progress error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '進捗更新に失敗しました' } },
      { status: 500 }
    )
  }
}
