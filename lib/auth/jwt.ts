import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production'

export interface JWTPayload {
  sessionId: string
  role: 'admin' | 'student'
  studentId?: string
  iat?: number
  exp?: number
}

export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '15m'): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  })
}

export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '8h', // 8時間
  })
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
}
