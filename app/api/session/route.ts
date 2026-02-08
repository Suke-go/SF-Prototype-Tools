import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPasscode } from '@/lib/auth/session'
import { createSessionSchema, updateSessionSchema } from '@/lib/validations/session'
import { getAuthContext, requireAuth, requireTeacher } from '@/lib/middleware/auth'
import { zodErrorResponse } from '@/lib/api/zod-error'

function unauthorized(message = 'ログインが必要です') {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message } }, { status: 401 })
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const body = await request.json().catch(() => ({}))
    const validatedData = createSessionSchema.parse(body)

    const themeIds = validatedData.themeIds
    const themes = await prisma.theme.findMany({
      where: {
        id: { in: themeIds },
        status: 'ACTIVE',
      },
      select: { id: true, title: true },
    })

    const themeById = new Map(themes.map((theme) => [theme.id, theme] as const))
    const selectedThemes = themeIds.map((themeId) => themeById.get(themeId)).filter(Boolean) as {
      id: string
      title: string
    }[]

    if (selectedThemes.length !== themeIds.length) {
      return NextResponse.json(
        { success: false, error: { code: 'THEME_NOT_FOUND', message: '選択したテーマが見つかりません' } },
        { status: 404 }
      )
    }

    const primaryTheme = selectedThemes[0]
    const computedTitle =
      validatedData.title?.trim() ||
      `${primaryTheme.title} ${new Date().toLocaleString('ja-JP', { hour12: false })}`

    const normalizedSessionCode = validatedData.sessionCode.trim().toUpperCase()
    const existsCode = await prisma.session.findUnique({
      where: { sessionCode: normalizedSessionCode },
      select: { id: true },
    })
    if (existsCode) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_CODE_ALREADY_USED', message: 'そのセッションコードは既に使われています' } },
        { status: 409 }
      )
    }

    const session = await prisma.session.create({
      data: {
        sessionCode: normalizedSessionCode,
        title: computedTitle.slice(0, 100),
        description: validatedData.description,
        schoolId: auth.schoolId,
        teacherId: auth.teacherId!,
        themeId: primaryTheme.id,
        maxParticipants: validatedData.maxParticipants,
        passcodeHash: await hashPasscode(validatedData.passcode),
        status: 'PREPARING',
        selectableThemes: {
          create: selectedThemes.map((theme) => ({
            themeId: theme.id,
          })),
        },
      },
      include: {
        theme: {
          select: {
            id: true,
            title: true,
          },
        },
        selectableThemes: {
          orderBy: { createdAt: 'asc' },
          select: {
            theme: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          session: {
            id: session.id,
            sessionCode: session.sessionCode,
            title: session.title,
            status: session.status,
            theme: session.theme,
            themes: session.selectableThemes.map((entry) => entry.theme),
            createdAt: session.createdAt.toISOString(),
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorized()
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Session creation error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'セッション作成に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(await getAuthContext(request))
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      if (auth.role !== 'teacher') return unauthorized()
      const status = searchParams.get('status')
      const q = searchParams.get('q')?.trim()
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const skipRaw = Number(searchParams.get('skip') || '0')
      const skip = Number.isFinite(skipRaw) && skipRaw > 0 ? Math.floor(skipRaw) : 0

      const createdAtFilter: { gte?: Date; lte?: Date } = {}
      if (from) createdAtFilter.gte = new Date(`${from}T00:00:00.000Z`)
      if (to) createdAtFilter.lte = new Date(`${to}T23:59:59.999Z`)

      const sessions = await prisma.session.findMany({
        where: {
          schoolId: auth.schoolId,
          teacherId: auth.teacherId,
          ...(status ? { status: status as 'PREPARING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' } : {}),
          ...(q
            ? {
              OR: [
                { title: { contains: q } },
                { sessionCode: { contains: q.toUpperCase() } },
              ],
            }
            : {}),
          ...(from || to ? { createdAt: createdAtFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: 20,
        select: {
          id: true,
          sessionCode: true,
          title: true,
          status: true,
          createdAt: true,
          theme: { select: { id: true, title: true } },
          selectableThemes: {
            orderBy: { createdAt: 'asc' },
            select: { theme: { select: { id: true, title: true } } },
          },
          _count: { select: { students: true } },
        },
      })
      return NextResponse.json({
        success: true,
        data: {
          sessions: sessions.map((session) => ({
            id: session.id,
            sessionCode: session.sessionCode,
            title: session.title,
            status: session.status,
            theme: session.theme,
            themes: session.selectableThemes.map((entry) => entry.theme),
            participantCount: session._count.students,
            createdAt: session.createdAt.toISOString(),
          })),
        },
      })
    }

    const where =
      auth.role === 'teacher'
        ? { id: sessionId, schoolId: auth.schoolId, teacherId: auth.teacherId }
        : { id: sessionId, schoolId: auth.schoolId }

    const session = await prisma.session.findFirst({
      where,
      include: {
        theme: true,
        selectableThemes: {
          orderBy: { createdAt: 'asc' },
          include: {
            theme: {
              select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
              },
            },
          },
        },
        _count: {
          select: { students: true },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: 'SESSION_NOT_FOUND', message: 'セッションが見つかりません' } },
        { status: 404 }
      )
    }

    if (auth.role === 'student' && auth.sessionId !== session.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションにはアクセスできません' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          sessionCode: session.sessionCode,
          title: session.title,
          description: session.description,
          themeId: session.themeId,
          theme: session.theme,
          themes: session.selectableThemes.map((entry) => entry.theme),
          status: session.status,
          maxParticipants: session.maxParticipants,
          currentParticipants: session._count.students,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorized()
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'セッション取得に失敗しました' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = requireTeacher(await getAuthContext(request))
    const body = await request.json().catch(() => ({}))
    const validatedData = updateSessionSchema.parse(body)
    const sessionId = body.sessionId || new URL(request.url).searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionIdが必要です' } },
        { status: 400 }
      )
    }

    const target = await prisma.session.findFirst({
      where: {
        id: sessionId,
        teacherId: auth.teacherId,
        schoolId: auth.schoolId,
      },
      select: { id: true },
    })
    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'このセッションを更新する権限がありません' } },
        { status: 403 }
      )
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        ...validatedData,
        ...(validatedData.startDate && { startDate: new Date(validatedData.startDate) }),
        ...(validatedData.endDate && { endDate: new Date(validatedData.endDate) }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          maxParticipants: session.maxParticipants,
          updatedAt: session.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorized()
    const zodRes = zodErrorResponse(error)
    if (zodRes) return zodRes
    console.error('Session update error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'セッション更新に失敗しました' } },
      { status: 500 }
    )
  }
}
