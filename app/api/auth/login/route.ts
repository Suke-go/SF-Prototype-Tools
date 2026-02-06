import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPasscode } from '@/lib/auth/session'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt'
import { loginSchema } from '@/lib/validations/session'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // セッションの取得
    const session = await prisma.session.findUnique({
      where: { id: validatedData.sessionId },
      include: { theme: true },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    // パスコードの検証
    if (!session.passcodeHash) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_PASSCODE', message: 'パスコードが設定されていません' } },
        { status: 400 }
      )
    }

    const isValid = await verifyPasscode(validatedData.passcode, session.passcodeHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PASSCODE', message: 'パスコードが正しくありません' } },
        { status: 401 }
      )
    }

    // JWTトークンの生成
    const accessToken = generateAccessToken({
      sessionId: session.id,
      role: 'admin',
    })

    const refreshToken = generateRefreshToken({
      sessionId: session.id,
      role: 'admin',
    })

    // Cookieに保存
    const cookieStore = cookies()
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15分
    })

    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8時間
    })

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          status: session.status,
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'バリデーションエラー', details: error } },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
