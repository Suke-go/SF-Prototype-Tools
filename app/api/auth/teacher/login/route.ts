import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt'
import { clearStudentAuthCookie, setTeacherAuthCookies } from '@/lib/auth/cookies'
import { teacherLoginSchema } from '@/lib/validations/auth'
import { rateLimitByIp } from '@/lib/middleware/rate-limit'
import { zodErrorResponse } from '@/lib/api/zod-error'

function extractIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.ip || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = extractIp(request)
    const ipLimit = rateLimitByIp(`login:ip:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    if (!ipLimit.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: `アクセスが集中しています。${ipLimit.retryAfterSec}秒後に再試行してください。` } },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const input = teacherLoginSchema.parse(body)

    // メールアドレス単位でもレート制限（辞書攻撃対策）
    const emailLimit = rateLimitByIp(`login:email:${input.email}`, { limit: 5, windowMs: 30 * 60 * 1000 })
    if (!emailLimit.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: `ログイン試行回数が上限に達しました。${emailLimit.retryAfterSec}秒後に再試行してください。` } },
        { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfterSec) } }
      )
    }

    const teacher = await prisma.teacher.findUnique({
      where: { email: input.email },
      include: { school: true },
    })
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'メールアドレスまたはパスワードが正しくありません' } },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(input.password, teacher.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'メールアドレスまたはパスワードが正しくありません' } },
        { status: 401 }
      )
    }

    const accessToken = generateAccessToken({
      role: 'teacher',
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
    })
    const refreshToken = generateRefreshToken({
      role: 'teacher',
      schoolId: teacher.schoolId,
      teacherId: teacher.id,
    })

    const response = NextResponse.json({
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
    // 教員ログイン時は生徒トークンを破棄してロール競合を避ける。
    clearStudentAuthCookie(response)
    setTeacherAuthCookies(response, accessToken, refreshToken)
    return response
  } catch (error) {
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Teacher login error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'ログインに失敗しました' } },
      { status: 500 }
    )
  }
}
