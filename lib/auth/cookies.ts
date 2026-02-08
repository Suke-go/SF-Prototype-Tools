import { NextResponse } from 'next/server'

function secureCookie() {
  return process.env.NODE_ENV === 'production'
}

export function setTeacherAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set('teacherToken', accessToken, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })
  response.cookies.set('teacherRefreshToken', refreshToken, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
}

export function clearTeacherAuthCookies(response: NextResponse) {
  response.cookies.set('teacherToken', '', { httpOnly: true, secure: secureCookie(), sameSite: 'lax', path: '/', maxAge: 0 })
  response.cookies.set('teacherRefreshToken', '', { httpOnly: true, secure: secureCookie(), sameSite: 'lax', path: '/', maxAge: 0 })
}

export function setStudentAuthCookie(response: NextResponse, studentToken: string) {
  response.cookies.set('studentToken', studentToken, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  })
}

export function clearStudentAuthCookie(response: NextResponse) {
  response.cookies.set('studentToken', '', { httpOnly: true, secure: secureCookie(), sameSite: 'strict', path: '/', maxAge: 0 })
}
