import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const teacher = await prisma.teacher.findUnique({
      where: { id: auth.teacherId },
      include: { school: true },
    })
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証情報が無効です' } },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          school: {
            id: teacher.school.id,
            code: teacher.school.code,
            name: teacher.school.name,
          },
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('Teacher me error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'ユーザー情報の取得に失敗しました' } },
      { status: 500 }
    )
  }
}
