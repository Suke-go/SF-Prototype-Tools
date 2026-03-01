import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthContext, requireStudent } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'
import {
  SURVEY_VERSION,
  POST_TEXT_QUESTIONS,
  coerceLikertAnswers,
  coercePostTextAnswers,
  safeSurveyAnswers,
  type SurveyPhase,
} from '@/lib/survey/definition'

const querySchema = z.object({
  sessionId: z.string().uuid(),
  phase: z.enum(['PRE', 'POST']).default('PRE'),
})

const saveSchema = z.object({
  sessionId: z.string().uuid(),
  phase: z.enum(['PRE', 'POST']),
  consentToResearch: z.boolean().optional(),
  consentToQuote: z.boolean().optional(),
  likertAnswers: z.record(z.number().int().min(1).max(5)).optional(),
  textAnswers: z.record(z.string().trim().max(300)).optional(),
})

async function loadStudent(sessionId: string, auth: ReturnType<typeof requireStudent>) {
  if (sessionId !== auth.sessionId) return null
  return prisma.student.findUnique({
    where: { id: auth.studentId },
    select: { id: true, sessionId: true, schoolId: true },
  })
}

async function loadPreSurvey(studentId: string) {
  return prisma.sessionSurveyResponse.findUnique({
    where: {
      studentId_phase: {
        studentId,
        phase: 'PRE',
      },
    },
    select: {
      id: true,
      consentToResearch: true,
      consentToQuote: true,
    },
  })
}

function buildAnswers(
  phase: SurveyPhase,
  likertAnswers: Record<string, number>,
  textAnswers: Record<string, string> | undefined
) {
  if (phase === 'PRE') {
    return {
      version: SURVEY_VERSION,
      likert: likertAnswers,
    }
  }
  const freeText = coercePostTextAnswers(textAnswers)
  return {
    version: SURVEY_VERSION,
    likert: likertAnswers,
    ...(Object.keys(freeText).length > 0 ? { freeText } : {}),
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const parsed = querySchema.parse({
      sessionId: new URL(request.url).searchParams.get('sessionId'),
      phase: new URL(request.url).searchParams.get('phase') || 'PRE',
    })

    const student = await loadStudent(parsed.sessionId, auth)
    if (!student || student.sessionId !== parsed.sessionId || student.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションにはアクセスできません' } },
        { status: 403 }
      )
    }

    const [response, preResponse] = await Promise.all([
      prisma.sessionSurveyResponse.findUnique({
        where: {
          studentId_phase: {
            studentId: student.id,
            phase: parsed.phase,
          },
        },
        select: {
          id: true,
          phase: true,
          consentToResearch: true,
          consentToQuote: true,
          answers: true,
          updatedAt: true,
        },
      }),
      loadPreSurvey(student.id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        phase: parsed.phase,
        preConsentToResearch: preResponse?.consentToResearch ?? null,
        response: response
          ? {
              id: response.id,
              phase: response.phase,
              consentToResearch: response.consentToResearch,
              consentToQuote: response.consentToQuote,
              answers: safeSurveyAnswers(response.answers),
              updatedAt: response.updatedAt.toISOString(),
            }
          : null,
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
    console.error('Survey fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'アンケートの取得に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireStudent(await getAuthContext(request))
    const raw = await request.json()
    const input = saveSchema.parse(raw)

    const student = await loadStudent(input.sessionId, auth)
    if (!student || student.sessionId !== input.sessionId || student.schoolId !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションには回答を保存できません' } },
        { status: 403 }
      )
    }

    let consentToResearch = false
    let consentToQuote = false
    let answers: Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined

    if (input.phase === 'PRE') {
      if (typeof input.consentToResearch !== 'boolean') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_REQUEST', message: '同意の選択が必要です' } },
          { status: 400 }
        )
      }

      consentToResearch = input.consentToResearch
      consentToQuote = Boolean(input.consentToQuote) && consentToResearch

      if (consentToResearch) {
        const likert = coerceLikertAnswers(input.likertAnswers || {}, 'PRE')
        if (!likert) {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_REQUEST', message: 'すべての設問に回答してください' } },
            { status: 400 }
          )
        }
        answers = buildAnswers('PRE', likert, undefined)
      } else {
        answers = Prisma.DbNull
      }
    } else {
      const preSurvey = await loadPreSurvey(student.id)
      if (!preSurvey || !preSurvey.consentToResearch) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: '事前同意がないため保存できません' } },
          { status: 403 }
        )
      }
      const likert = coerceLikertAnswers(input.likertAnswers || {}, 'POST')
      if (!likert) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_REQUEST', message: 'すべての設問に回答してください' } },
          { status: 400 }
        )
      }
      consentToResearch = true
      consentToQuote = preSurvey.consentToQuote
      answers = buildAnswers('POST', likert, input.textAnswers)
    }

    const saved = await prisma.sessionSurveyResponse.upsert({
      where: {
        studentId_phase: {
          studentId: student.id,
          phase: input.phase,
        },
      },
      create: {
        sessionId: input.sessionId,
        studentId: student.id,
        phase: input.phase,
        consentToResearch,
        consentToQuote,
        answers,
      },
      update: {
        consentToResearch,
        consentToQuote,
        answers,
      },
      select: {
        id: true,
        phase: true,
        consentToResearch: true,
        consentToQuote: true,
        answers: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        response: {
          id: saved.id,
          phase: saved.phase,
          consentToResearch: saved.consentToResearch,
          consentToQuote: saved.consentToQuote,
          answers: safeSurveyAnswers(saved.answers),
          updatedAt: saved.updatedAt.toISOString(),
        },
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
    console.error('Survey save error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'アンケート保存に失敗しました' } },
      { status: 500 }
    )
  }
}
