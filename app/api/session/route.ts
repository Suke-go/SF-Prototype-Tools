import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSessionId, hashPasscode } from '@/lib/auth/session'
import { createSessionSchema, updateSessionSchema } from '@/lib/validations/session'
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

// セッション作成
export async function POST(request: NextRequest) {
  try {
    // NOTE: セッション作成は「初回は未ログインの管理者が行う」ため未認証で許可する。
    // 作成成功後に管理者用Cookie（access/refresh）を発行してログイン状態にする。

    const body = await request.json()
    const validatedData = createSessionSchema.parse(body)

    // テーマの存在確認
    const theme = await prisma.theme.findUnique({
      where: { id: validatedData.themeId },
    })

    if (!theme) {
      return NextResponse.json(
        { success: false, error: { code: 'THEME_NOT_FOUND', message: 'テーマが見つかりません' } },
        { status: 404 }
      )
    }

    // セッションIDの生成
    const sessionId = generateSessionId()

    // パスコードのハッシュ化
    const passcodeHash = await hashPasscode(validatedData.passcode)

    // セッション名は必須にしない（未入力ならテーマ名+日時で生成）
    const computedTitle =
      validatedData.title?.trim() ||
      `${theme.title} ${new Date().toLocaleString('ja-JP', { hour12: false })}`

    // セッションの作成
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        title: computedTitle.slice(0, 100),
        description: validatedData.description,
        schoolId: null, // TODO: Future Workでマルチテナント対応
        themeId: validatedData.themeId,
        maxParticipants: validatedData.maxParticipants,
        passcodeHash,
        status: 'PREPARING',
      },
      include: {
        theme: true,
      },
    })

    // 管理者Cookieを発行（このセッションの管理者としてログイン）
    const accessToken = generateAccessToken({ sessionId: session.id, role: 'admin' })
    const refreshToken = generateRefreshToken({ sessionId: session.id, role: 'admin' })
    const cookieStore = cookies()
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    })
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          session: {
            id: session.id,
            title: session.title,
            status: session.status,
            createdAt: session.createdAt.toISOString(),
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'バリデーションエラー', details: error } },
        { status: 400 }
      )
    }

    console.error('Session creation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// 現在のセッション取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'セッションIDが必要です' } },
        { status: 400 }
      )
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        theme: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          description: session.description,
          themeId: session.themeId,
          theme: session.theme,
          status: session.status,
          maxParticipants: session.maxParticipants,
          currentParticipants: session._count.students,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}

// セッション更新
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const cookieStore = cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
        { status: 401 }
      )
    }

    try {
      const payload = verifyAccessToken(accessToken)
      if (payload.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: '権限がありません' } },
          { status: 403 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '認証トークンが無効です' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    // セッションIDの取得（リクエストボディまたはクエリパラメータから）
    const sessionId = body.sessionId || new URL(request.url).searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'セッションIDが必要です' } },
        { status: 400 }
      )
    }

    // セッションの更新
    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...validatedData,
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          maxParticipants: session.maxParticipants,
          updatedAt: session.updatedAt.toISOString(),
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

    console.error('Session update error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'サーバーエラーが発生しました' } },
      { status: 500 }
    )
  }
}
