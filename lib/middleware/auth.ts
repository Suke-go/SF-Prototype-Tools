import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

export interface AuthContext {
  role: 'teacher' | 'student'
  schoolId: string
  teacherId?: string
  sessionId?: string
  studentId?: string
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    const teacherToken = request.cookies.get('teacherToken')?.value
    const studentToken = request.cookies.get('studentToken')?.value
    const token = teacherToken || studentToken

    if (!token) return null

    const payload = verifyAccessToken(token)
    if (payload.role === 'teacher' && payload.teacherId) {
      return {
        role: 'teacher',
        schoolId: payload.schoolId,
        teacherId: payload.teacherId,
      }
    }

    if (payload.role === 'student' && payload.studentId && payload.sessionId) {
      return {
        role: 'student',
        schoolId: payload.schoolId,
        sessionId: payload.sessionId,
        studentId: payload.studentId,
      }
    }

    return null
  } catch {
    return null
  }
}

export function requireAuth(authContext: AuthContext | null): AuthContext {
  if (!authContext) throw new Error('UNAUTHORIZED')
  return authContext
}

export function requireTeacher(authContext: AuthContext | null): AuthContext {
  if (!authContext || authContext.role !== 'teacher' || !authContext.teacherId) {
    throw new Error('UNAUTHORIZED')
  }
  return authContext
}

export function requireStudent(authContext: AuthContext | null): AuthContext {
  if (!authContext || authContext.role !== 'student' || !authContext.studentId || !authContext.sessionId) {
    throw new Error('UNAUTHORIZED')
  }
  return authContext
}
