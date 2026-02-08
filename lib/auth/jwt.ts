import jwt, { type SignOptions } from 'jsonwebtoken'

function requiredEnv(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

export type AuthRole = 'teacher' | 'student'

export interface JWTPayload {
  role: AuthRole
  schoolId: string
  teacherId?: string
  sessionId?: string
  studentId?: string
  iat?: number
  exp?: number
}

export function generateAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: SignOptions['expiresIn'] = '2h'
): string {
  return jwt.sign(payload as object, requiredEnv('JWT_SECRET'), { expiresIn })
}

export function generateRefreshToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: SignOptions['expiresIn'] = '8h'
): string {
  return jwt.sign(payload as object, requiredEnv('JWT_REFRESH_SECRET'), { expiresIn })
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, requiredEnv('JWT_SECRET')) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, requiredEnv('JWT_REFRESH_SECRET')) as JWTPayload
}
