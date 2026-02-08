import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/student/session/')) {
    const parts = pathname.split('/').filter(Boolean)
    const isSessionRoot = parts.length === 3
    if (!isSessionRoot) {
      const studentToken = request.cookies.get('studentToken')?.value
      if (!studentToken || !(await isValidToken(studentToken))) {
        // トークンが無効・期限切れの場合、Cookieを削除してリダイレクト
        const response = NextResponse.redirect(new URL('/student', request.url))
        response.cookies.delete('studentToken')
        return response
      }
    }
  }

  if (pathname.startsWith('/admin/')) {
    const teacherToken = request.cookies.get('teacherToken')?.value
    if (!teacherToken || !(await isValidToken(teacherToken))) {
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('teacherToken')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/session/:path*', '/admin/:path*'],
}
