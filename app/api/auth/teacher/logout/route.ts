import { NextResponse } from 'next/server'
import { clearTeacherAuthCookies } from '@/lib/auth/cookies'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { message: 'ログアウトしました' },
  })
  clearTeacherAuthCookies(response)
  return response
}
