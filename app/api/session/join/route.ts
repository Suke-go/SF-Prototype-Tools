import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPasscode } from '@/lib/auth/session'
import { generateAccessToken, verifyAccessToken } from '@/lib/auth/jwt'
import { clearTeacherAuthCookies, setStudentAuthCookie } from '@/lib/auth/cookies'
import { rateLimitByIp } from '@/lib/middleware/rate-limit'
import { zodErrorResponse } from '@/lib/api/zod-error'

const joinSchema = z
  .object({
    sessionId: z.string().uuid('sessionIdの形式が不正です').optional(),
    sessionCode: z
      .string()
      .trim()
      .min(4, 'sessionCodeは4文字以上で入力してください')
      .max(32, 'sessionCodeは32文字以内で入力してください')
      .regex(/^[A-Za-z0-9_-]+$/, 'sessionCodeの形式が不正です')
      .optional(),
    studentName: z.string().trim().min(1, '表示名を入力してください').max(50, '表示名は50文字以内です').optional(),
    passcode: z.string().trim().min(4, '参加コードは4文字以上で入力してください').max(128, '参加コードが長すぎます'),
  })
  .refine((value) => Boolean(value.sessionId || value.sessionCode), {
    message: 'sessionId または sessionCode が必要です',
    path: ['sessionCode'],
  })

function extractIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.ip || 'unknown'
}

function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'RATE_LIMITED', message: `アクセスが集中しています。${retryAfterSec}秒後に再試行してください。` },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const ip = extractIp(request)
    const rawSessionCode = typeof body?.sessionCode === 'string' ? body.sessionCode.trim().toUpperCase() : ''
    const rawSessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''

    const ipBurstGuard = rateLimitByIp(`join:guard:${ip}`, { limit: 120, windowMs: 10 * 60 * 1000 })
    if (!ipBurstGuard.ok) return rateLimitedResponse(ipBurstGuard.retryAfterSec)

    if (rawSessionCode) {
      const scopedLimit = rateLimitByIp(`join:${ip}:${rawSessionCode}`, { limit: 60, windowMs: 10 * 60 * 1000 })
      if (!scopedLimit.ok) return rateLimitedResponse(scopedLimit.retryAfterSec)
    } else if (rawSessionId) {
      const scopedLimit = rateLimitByIp(`join:${ip}:${rawSessionId}`, { limit: 60, windowMs: 10 * 60 * 1000 })
      if (!scopedLimit.ok) return rateLimitedResponse(scopedLimit.retryAfterSec)
    } else {
      const noSessionLimit = rateLimitByIp(`join:${ip}:unknown`, { limit: 5, windowMs: 10 * 60 * 1000 })
      if (!noSessionLimit.ok) return rateLimitedResponse(noSessionLimit.retryAfterSec)
    }

    const input = joinSchema.parse(body)

    const normalizedCode = input.sessionCode?.trim().toUpperCase()
    const session = await prisma.session.findFirst({
      where: input.sessionId ? { id: input.sessionId } : { sessionCode: normalizedCode },
      select: {
        id: true,
        sessionCode: true,
        schoolId: true,
        status: true,
        maxParticipants: true,
        passcodeHash: true,
      },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    if (!['PREPARING', 'ACTIVE'].includes(session.status)) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_CLOSED', message: 'このセッションは参加受付を終了しています' } },
        { status: 403 }
      )
    }

    const validPasscode = await verifyPasscode(input.passcode, session.passcodeHash)
    if (!validPasscode) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PASSCODE', message: '参加コードが正しくありません' } },
        { status: 401 }
      )
    }

    const existingToken = request.cookies.get('studentToken')?.value
    if (existingToken) {
      try {
        const payload = verifyAccessToken(existingToken)
        if (
          payload.role === 'student' &&
          payload.studentId &&
          payload.sessionId === session.id &&
          payload.schoolId === session.schoolId
        ) {
          return NextResponse.json({
            success: true,
            data: {
              studentId: payload.studentId,
              sessionId: session.id,
              sessionCode: session.sessionCode,
              reused: true,
            },
          })
        }
      } catch {
        // Ignore invalid/expired token and continue with fresh join.
      }
    }

    const currentParticipants = await prisma.student.count({
      where: { sessionId: session.id },
    })
    if (currentParticipants >= session.maxParticipants) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_FULL', message: 'このセッションは満員です' } },
        { status: 409 }
      )
    }

    const studentId = crypto.randomUUID()
    await prisma.student.create({
      data: {
        id: studentId,
        sessionId: session.id,
        schoolId: session.schoolId,
        name: input.studentName || null,
        progressStatus: 'BIG_FIVE',
      },
    })

    const studentToken = generateAccessToken(
      { role: 'student', schoolId: session.schoolId, sessionId: session.id, studentId },
      '24h'
    )
    const response = NextResponse.json(
      {
        success: true,
        data: {
          studentId,
          sessionId: session.id,
          sessionCode: session.sessionCode,
        },
      },
      { status: 201 }
    )
    clearTeacherAuthCookies(response)
    setStudentAuthCookie(response, studentToken)
    return response
  } catch (error) {
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Session join error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '参加処理に失敗しました' } },
      { status: 500 }
    )
  }
}
