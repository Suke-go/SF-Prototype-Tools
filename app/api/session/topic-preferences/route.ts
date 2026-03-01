import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PreferenceSchema = z.object({
    sessionId: z.string().uuid(),
    selections: z.array(z.string().uuid()).min(2).max(2),
})

// POST: 生徒が興味あるテーマを2つ保存
export async function POST(request: NextRequest) {
    try {
        const studentToken = request.cookies.get('studentToken')?.value
        if (!studentToken) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
                { status: 401 }
            )
        }

        // Decode student from JWT (simplified — reuse existing pattern)
        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(process.env.JWT_SECRET)
        let studentId: string
        try {
            const { payload } = await jwtVerify(studentToken, secret)
            studentId = payload.studentId as string
        } catch {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'トークンが無効です' } },
                { status: 401 }
            )
        }

        const body = await request.json()
        const parsed = PreferenceSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION', message: parsed.error.errors[0]?.message || '入力が不正です' } },
                { status: 400 }
            )
        }

        const { sessionId, selections } = parsed.data
        const [firstChoice, secondChoice] = selections

        // Verify student belongs to this session
        const student = await prisma.student.findFirst({
            where: { id: studentId, sessionId },
        })
        if (!student) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'セッションに参加していません' } },
                { status: 404 }
            )
        }

        // Verify themes are valid for this session
        const sessionThemes = await prisma.sessionTheme.findMany({
            where: { sessionId },
            select: { themeId: true },
        })
        const validThemeIds = new Set(sessionThemes.map(st => st.themeId))
        // Also include the primary theme
        const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { themeId: true } })
        if (session) validThemeIds.add(session.themeId)

        if (!validThemeIds.has(firstChoice) || !validThemeIds.has(secondChoice)) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_THEME', message: '選択されたテーマが無効です' } },
                { status: 400 }
            )
        }

        if (firstChoice === secondChoice) {
            return NextResponse.json(
                { success: false, error: { code: 'DUPLICATE', message: '異なる2つのテーマを選択してください' } },
                { status: 400 }
            )
        }

        // Upsert preferences (delete old + create new in transaction)
        await prisma.$transaction([
            prisma.topicPreference.deleteMany({ where: { studentId, sessionId } }),
            prisma.topicPreference.create({ data: { studentId, sessionId, themeId: firstChoice, rank: 1 } }),
            prisma.topicPreference.create({ data: { studentId, sessionId, themeId: secondChoice, rank: 2 } }),
        ])

        return NextResponse.json({
            success: true,
            data: { firstChoice, secondChoice },
        })
    } catch (error) {
        console.error('TopicPreference error:', error)
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL', message: '保存に失敗しました' } },
            { status: 500 }
        )
    }
}

// GET: 生徒の現在の選択状態を取得
export async function GET(request: NextRequest) {
    try {
        const studentToken = request.cookies.get('studentToken')?.value
        if (!studentToken) {
            return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
        }

        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(process.env.JWT_SECRET)
        let studentId: string
        try {
            const { payload } = await jwtVerify(studentToken, secret)
            studentId = payload.studentId as string
        } catch {
            return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
        }

        const sessionId = new URL(request.url).searchParams.get('sessionId')
        if (!sessionId) {
            return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'sessionId が必要です' } }, { status: 400 })
        }

        const preferences = await prisma.topicPreference.findMany({
            where: { studentId, sessionId },
            orderBy: { rank: 'asc' },
            include: { theme: { select: { id: true, title: true } } },
        })

        return NextResponse.json({
            success: true,
            data: { preferences },
        })
    } catch (error) {
        console.error('TopicPreference GET error:', error)
        return NextResponse.json({ success: false, error: { code: 'INTERNAL' } }, { status: 500 })
    }
}
