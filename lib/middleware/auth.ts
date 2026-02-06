import { NextRequest } from 'next/server'
import { verifyAccessToken, JWTPayload } from '@/lib/auth/jwt'
import { cookies } from 'next/headers'

export interface AuthContext {
  sessionId: string
  role: 'admin' | 'student'
  studentId?: string
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies()

    // NOTE: admin と student で Cookie を分ける（同一ブラウザでの衝突回避）
    const accessToken = cookieStore.get('accessToken')?.value || cookieStore.get('studentToken')?.value

    if (!accessToken) {
      return null
    }

    const payload = verifyAccessToken(accessToken)
    return {
      sessionId: payload.sessionId,
      role: payload.role,
      studentId: payload.studentId,
    }
  } catch (error) {
    return null
  }
}

export function requireAuth(authContext: AuthContext | null, requiredRole?: 'admin' | 'student'): AuthContext {
  if (!authContext) {
    throw new Error('UNAUTHORIZED')
  }

  if (requiredRole && authContext.role !== requiredRole) {
    throw new Error('FORBIDDEN')
  }

  return authContext
}
