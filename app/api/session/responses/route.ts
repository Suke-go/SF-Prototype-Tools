import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireAuth } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(await getAuthContext(request))
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const themeId = url.searchParams.get('themeId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    if (auth.role === 'student' && sessionId !== auth.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションにはアクセスできません' } },
        { status: 403 }
      )
    }

    const session = await prisma.session.findFirst({
      where:
        auth.role === 'teacher'
          ? { id: sessionId, schoolId: auth.schoolId, teacherId: auth.teacherId }
          : { id: sessionId, schoolId: auth.schoolId },
      select: {
        id: true,
        themeId: true,
        selectableThemes: {
          select: { themeId: true },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションにアクセスする権限がありません' } },
        { status: 403 }
      )
    }

    const allowedThemeIds =
      session.selectableThemes.length > 0 ? session.selectableThemes.map((entry) => entry.themeId) : [session.themeId]

    const targetThemeIds = themeId ? [themeId] : allowedThemeIds
    if (targetThemeIds.some((id) => !allowedThemeIds.includes(id))) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このテーマはセッションで利用できません' } },
        { status: 403 }
      )
    }

    const themeOrderMap = new Map(targetThemeIds.map((id, index) => [id, index] as const))
    const questions = await prisma.question.findMany({
      where: { themeId: { in: targetThemeIds } },
      select: { id: true, order: true, questionText: true, themeId: true },
    })
    questions.sort((a, b) => {
      const themeDiff = (themeOrderMap.get(a.themeId) ?? 999) - (themeOrderMap.get(b.themeId) ?? 999)
      if (themeDiff !== 0) return themeDiff
      return a.order - b.order
    })

    const questionIds = questions.map((question) => question.id)

    const students = await prisma.student.findMany({
      where: { sessionId },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        name: true,
        progressStatus: true,
        bigFiveResult: {
          select: {
            extraversion: true,
            agreeableness: true,
            conscientiousness: true,
            neuroticism: true,
            openness: true,
          },
        },
      },
    })

    const responses =
      questionIds.length > 0
        ? await prisma.studentResponse.findMany({
            where: { sessionId, questionId: { in: questionIds } },
            select: {
              studentId: true,
              questionId: true,
              responseValue: true,
            },
          })
        : []

    const isTeacher = auth.role === 'teacher'

    // Students should not see raw IDs of peers, so pseudonymize by session.
    const anonymizedIdMap = new Map<string, string>()
    const shuffledIndices = students.map((_, i) => i)
    let seed = 0
    for (const ch of sessionId) seed = (seed * 31 + ch.charCodeAt(0)) | 0
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) | 0
      const j = ((seed >>> 16) & 0x7fff) % (i + 1)
      ;[shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]]
    }
    students.forEach((student, index) => {
      const anonIndex = shuffledIndices[index]
      const anonId = `P${String(anonIndex + 1).padStart(2, '0')}`
      anonymizedIdMap.set(student.id, anonId)
    })

    const toOutputId = (realStudentId: string) =>
      isTeacher ? realStudentId : anonymizedIdMap.get(realStudentId) || realStudentId

    const responseMap: Record<string, Record<string, 'YES' | 'NO' | 'UNKNOWN'>> = {}
    for (const response of responses) {
      const outputId = toOutputId(response.studentId)
      if (!responseMap[outputId]) responseMap[outputId] = {}
      responseMap[outputId][response.questionId] = response.responseValue
    }

    const questionDistributions = questions.map((question) => {
      let yes = 0
      let no = 0
      let unknown = 0

      for (const student of students) {
        const outputId = toOutputId(student.id)
        const value = responseMap[outputId]?.[question.id]
        if (value === 'YES') yes += 1
        else if (value === 'NO') no += 1
        else unknown += 1
      }

      return {
        questionId: question.id,
        yes,
        no,
        unknown,
      }
    })

    const vectors = students.map((student) => {
      const outputId = toOutputId(student.id)
      const qVector = questions.map((question) => {
        const value = responseMap[outputId]?.[question.id]
        if (value === 'YES') return 1
        if (value === 'NO') return -1
        return 0
      })
      const bigFive = student.bigFiveResult
      const bfVector =
        isTeacher && bigFive
          ? [bigFive.extraversion, bigFive.agreeableness, bigFive.conscientiousness, bigFive.neuroticism, bigFive.openness]
          : [0, 0, 0, 0, 0]

      return {
        studentId: outputId,
        name: isTeacher ? student.name : null,
        isSelf: auth.role === 'student' ? student.id === auth.studentId : false,
        vector: [...qVector, ...bfVector],
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        selectedThemeId: themeId || null,
        questions: questions.map((question) => ({
          id: question.id,
          order: question.order,
          text: question.questionText,
          themeId: question.themeId,
        })),
        students: students.map((student) => {
          const outputId = toOutputId(student.id)
          return {
            id: outputId,
            name: isTeacher ? student.name : null,
            isSelf: auth.role === 'student' ? student.id === auth.studentId : false,
            progressStatus: student.progressStatus,
            bigFive: isTeacher ? student.bigFiveResult : undefined,
          }
        }),
        vectors,
        questionDistributions,
        ...(isTeacher ? { responseMap } : {}),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    console.error('Session responses fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '回答データの取得に失敗しました' } },
      { status: 500 }
    )
  }
}
