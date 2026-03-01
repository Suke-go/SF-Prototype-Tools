import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, SignJWT } from 'jose'

const jwtSecretValue = process.env.JWT_SECRET
if (!jwtSecretValue) throw new Error('JWT_SECRET environment variable is required')
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue)

const jwtRefreshSecretValue = process.env.JWT_REFRESH_SECRET
if (!jwtRefreshSecretValue) throw new Error('JWT_REFRESH_SECRET environment variable is required')
const JWT_REFRESH_SECRET = new TextEncoder().encode(jwtRefreshSecretValue)

async function verifyToken(token: string, secret: Uint8Array): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

async function signAccessToken(payload: Record<string, unknown>): Promise<string> {
  const { iat, exp, ...claims } = payload
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(JWT_SECRET)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- 生徒ルート ---
  if (pathname.startsWith('/student/session/')) {
    const parts = pathname.split('/').filter(Boolean)
    const isSessionRoot = parts.length === 3
    if (!isSessionRoot) {
      const studentToken = request.cookies.get('studentToken')?.value
      if (!studentToken || !(await verifyToken(studentToken, JWT_SECRET))) {
        const response = NextResponse.redirect(new URL('/student', request.url))
        response.cookies.delete('studentToken')
        return response
      }
    }
  }

  // --- 教員ルート（リフレッシュトークン自動更新付き） ---
  if (pathname.startsWith('/admin/')) {
    const teacherToken = request.cookies.get('teacherToken')?.value
    const isAccessValid = teacherToken ? await verifyToken(teacherToken, JWT_SECRET) : null

    if (isAccessValid) {
      // accessToken 有効 → そのまま通す
      return NextResponse.next()
    }

    // accessToken が無効/期限切れ → refreshToken で自動更新を試行
    const refreshToken = request.cookies.get('teacherRefreshToken')?.value
    if (refreshToken) {
      const refreshPayload = await verifyToken(refreshToken, JWT_REFRESH_SECRET)
      if (refreshPayload && refreshPayload.role === 'teacher') {
        // 新しい accessToken を発行
        const newAccessToken = await signAccessToken(refreshPayload)
        const response = NextResponse.next()
        response.cookies.set('teacherToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 2 * 60 * 60, // 2時間
        })
        return response
      }
    }

    // 両方無効 → ログイン画面にリダイレクト
    const response = NextResponse.redirect(new URL('/admin', request.url))
    response.cookies.delete('teacherToken')
    response.cookies.delete('teacherRefreshToken')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/session/:path*', '/admin/:path*'],
}

