import { NextRequest, NextResponse } from 'next/server'
import { zodErrorResponse } from '@/lib/api/zod-error'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt'
import { clearStudentAuthCookie, setTeacherAuthCookies } from '@/lib/auth/cookies'
import { teacherRegisterSchema } from '@/lib/validations/auth'
import { rateLimitByIp } from '@/lib/middleware/rate-limit'

function extractIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.ip || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = extractIp(request)
    const ipLimit = rateLimitByIp(`register:ip:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!ipLimit.ok) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: `登録試行回数の上限に達しました。${ipLimit.retryAfterSec}秒後に再試行してください。` } },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSec) } }
      )
    }

    const body = await request.json()
    const input = teacherRegisterSchema.parse(body)

    // 招待コードの検証
    const invite = await prisma.inviteCode.findUnique({
      where: { code: input.inviteCode },
    })
    if (!invite) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INVITE', message: '招待コードが無効です' } },
        { status: 403 }
      )
    }
    if (invite.usedBy) {
      return NextResponse.json(
        { success: false, error: { code: 'INVITE_USED', message: 'この招待コードは既に使用されています' } },
        { status: 403 }
      )
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: { code: 'INVITE_EXPIRED', message: '招待コードの有効期限が切れています' } },
        { status: 403 }
      )
    }

    const existingTeacher = await prisma.teacher.findUnique({
      where: { email: input.email },
      select: { id: true },
    })
    if (existingTeacher) {
      return NextResponse.json(
        { success: false, error: { code: 'EMAIL_ALREADY_USED', message: 'このメールアドレスは既に登録されています' } },
        { status: 409 }
      )
    }

    const existingSchool = await prisma.school.findUnique({
      where: { code: input.schoolCode },
    })
    const school =
      existingSchool ||
      (await prisma.school.create({
        data: {
          code: input.schoolCode,
          name: input.schoolName,
          status: 'ACTIVE',
        },
      }))

    const teacher = await prisma.teacher.create({
      data: {
        schoolId: school.id,
        name: input.teacherName,
        email: input.email,
        passwordHash: await hashPassword(input.password),
      },
    })

    // 招待コードを使用済みに更新
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedBy: teacher.id },
    })

    const accessToken = generateAccessToken({
      role: 'teacher',
      schoolId: school.id,
      teacherId: teacher.id,
    })
    const refreshToken = generateRefreshToken({
      role: 'teacher',
      schoolId: school.id,
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
            id: school.id,
            code: school.code,
            name: school.name,
          },
        },
      },
    })
    clearStudentAuthCookie(response)
    setTeacherAuthCookies(response, accessToken, refreshToken)
    return response
  } catch (error) {
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Teacher register error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '教員登録に失敗しました' } },
      { status: 500 }
    )
  }
}
