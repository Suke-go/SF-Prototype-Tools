import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

// 生徒のセッション参加（studentIdの発行・Cookie設定）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sessionId = body?.sessionId

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    // studentId を新規発行（匿名参加）
    const studentId = crypto.randomUUID()

    await prisma.student.create({
      data: {
        id: studentId,
        sessionId,
        schoolId: null,
        progressStatus: 'BIG_FIVE',
      },
    })

    // student 用 Cookie（8時間有効、adminと衝突しないように別名）
    const studentToken = generateAccessToken({ sessionId, role: 'student', studentId }, '8h')
    const cookieStore = cookies()
    cookieStore.set('studentToken', studentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,  // 8時間
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          studentId,
          sessionId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Session join error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

