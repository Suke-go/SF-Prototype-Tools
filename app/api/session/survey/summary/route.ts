import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireTeacher } from '@/lib/middleware/auth'
import {
  COMMON_SURVEY_QUESTIONS,
  POST_ONLY_SURVEY_QUESTIONS,
  POST_TEXT_QUESTIONS,
  safeSurveyAnswers,
} from '@/lib/survey/definition'
import { zodErrorResponse } from '@/lib/api/zod-error'

const querySchema = z.object({
  sessionId: z.string().uuid(),
})

type ParsedResponse = {
  studentId: string
  phase: 'PRE' | 'POST'
  consentToResearch: boolean
  consentToQuote: boolean
  answers: ReturnType<typeof safeSurveyAnswers>
}

function round(value: number, precision = 2) {
  const scale = 10 ** precision
  return Math.round(value * scale) / scale
}

function mean(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function collectNumericValues(values: Array<unknown>): number[] {
  const result: number[] = []
  for (const value of values) {
    if (typeof value === 'number') result.push(value)
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const parsed = querySchema.parse({
      sessionId: new URL(request.url).searchParams.get('sessionId'),
    })

    const session = await prisma.session.findFirst({
      where: { id: parsed.sessionId, schoolId: auth.schoolId, teacherId: auth.teacherId },
      select: { id: true, title: true },
    })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションを参照する権限がありません' } },
        { status: 403 }
      )
    }

    const [participantCount, rawResponses] = await Promise.all([
      prisma.student.count({
        where: { sessionId: parsed.sessionId },
      }),
      prisma.sessionSurveyResponse.findMany({
        where: { sessionId: parsed.sessionId },
        select: {
          studentId: true,
          phase: true,
          consentToResearch: true,
          consentToQuote: true,
          answers: true,
        },
      }),
    ])

    const responses: ParsedResponse[] = rawResponses.map((response) => ({
      studentId: response.studentId,
      phase: response.phase,
      consentToResearch: response.consentToResearch,
      consentToQuote: response.consentToQuote,
      answers: safeSurveyAnswers(response.answers),
    }))

    const preResponses = responses.filter((response) => response.phase === 'PRE')
    const postResponses = responses.filter((response) => response.phase === 'POST')

    const preByStudent = new Map(preResponses.map((response) => [response.studentId, response]))
    const postByStudent = new Map(postResponses.map((response) => [response.studentId, response]))

    const preLikertStats = COMMON_SURVEY_QUESTIONS.map((question) => {
      const values = collectNumericValues(
        preResponses
          .filter((response) => response.consentToResearch)
          .map((response) => response.answers?.likert[question.id])
      )
      return {
        id: question.id,
        text: question.text,
        mean: round(mean(values)),
        count: values.length,
      }
    })

    const postLikertStats = [...COMMON_SURVEY_QUESTIONS, ...POST_ONLY_SURVEY_QUESTIONS].map((question) => {
      const values = collectNumericValues(
        postResponses
          .filter((response) => response.consentToResearch)
          .map((response) => response.answers?.likert[question.id])
      )
      return {
        id: question.id,
        text: question.text,
        mean: round(mean(values)),
        count: values.length,
      }
    })

    const deltaStats = COMMON_SURVEY_QUESTIONS.map((question) => {
      const preValues: number[] = []
      const postValues: number[] = []

      for (const [studentId, pre] of preByStudent) {
        if (!pre.consentToResearch) continue
        const post = postByStudent.get(studentId)
        if (!post || !post.consentToResearch) continue
        const preValue = pre.answers?.likert[question.id]
        const postValue = post.answers?.likert[question.id]
        if (typeof preValue !== 'number' || typeof postValue !== 'number') continue
        preValues.push(preValue)
        postValues.push(postValue)
      }

      const preMean = mean(preValues)
      const postMean = mean(postValues)
      return {
        id: question.id,
        text: question.text,
        preMean: round(preMean),
        postMean: round(postMean),
        delta: round(postMean - preMean),
        pairCount: preValues.length,
      }
    })

    const freeText = POST_TEXT_QUESTIONS.map((question) => {
      const responses = postResponses
        .filter((response) => response.consentToResearch)
        .map((response) => ({
          studentLabel: `S-${response.studentId.slice(0, 8)}`,
          text: response.answers?.freeText?.[question.id] || '',
        }))
        .filter((response) => response.text.trim().length > 0)
      return {
        id: question.id,
        text: question.text,
        responses,
      }
    })

    const consentedStudentIds = new Set(
      preResponses.filter((response) => response.consentToResearch).map((response) => response.studentId)
    )
    const postCompletedOnConsented = postResponses.filter((response) =>
      consentedStudentIds.has(response.studentId)
    ).length

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
        },
        summary: {
          participantCount,
          preSubmittedCount: preResponses.length,
          postSubmittedCount: postResponses.length,
          consentToResearchCount: preResponses.filter((response) => response.consentToResearch).length,
          consentToQuoteCount: preResponses.filter((response) => response.consentToResearch && response.consentToQuote).length,
          postCompletedOnConsented,
        },
        preLikertStats,
        postLikertStats,
        deltaStats,
        freeText,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
        { status: 401 }
      )
    }
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Survey summary fetch error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'アンケート集計の取得に失敗しました' } },
      { status: 500 }
    )
  }
}
