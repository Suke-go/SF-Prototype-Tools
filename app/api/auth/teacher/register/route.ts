import { NextRequest, NextResponse } from 'next/server'
import { zodErrorResponse } from '@/lib/api/zod-error'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt'
import { clearStudentAuthCookie, setTeacherAuthCookies } from '@/lib/auth/cookies'
import { teacherRegisterSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = teacherRegisterSchema.parse(body)

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
    // 教員登録時は生徒トークンを破棄してロール競合を避ける。
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
