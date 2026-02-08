import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

const resetSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const body = await request.json()
    const input = resetSchema.parse(body)

    const session = await prisma.session.findFirst({
      where: { id: input.sessionId, schoolId: auth.schoolId, teacherId: auth.teacherId },
      select: { id: true },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションを操作する権限がありません' } },
        { status: 403 }
      )
    }

    const student = await prisma.student.findFirst({
      where: { id: input.studentId, sessionId: input.sessionId, schoolId: auth.schoolId },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: 'STUDENT_NOT_FOUND', message: '学生が見つかりません' } },
        { status: 404 }
      )
    }

    await prisma.$transaction([
      prisma.bigFiveResult.deleteMany({ where: { studentId: input.studentId } }),
      prisma.student.update({
        where: { id: input.studentId },
        data: { progressStatus: 'BIG_FIVE' },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: { message: 'Big Five回答をリセットしました' },
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
    console.error('Reset BigFive error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'リセット処理に失敗しました' } },
      { status: 500 }
    )
  }
}
