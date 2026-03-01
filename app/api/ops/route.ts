import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

function verifyOpsSecret(request: NextRequest): boolean {
    const secret = process.env.OPS_SECRET
    if (!secret) return false
    const provided =
        request.headers.get('x-ops-secret') ||
        new URL(request.url).searchParams.get('key')
    if (!provided || provided.length !== secret.length) return false
    // Timing-safe comparison
    let result = 0
    for (let i = 0; i < secret.length; i++) {
        result |= secret.charCodeAt(i) ^ provided.charCodeAt(i)
    }
    return result === 0
}

function unauthorized() {
    return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '運用キーが無効です' } },
        { status: 401 }
    )
}

// ---------- GET: 招待コード一覧 + テーマ一覧（設問含む） ----------
export async function GET(request: NextRequest) {
    if (!verifyOpsSecret(request)) return unauthorized()

    try {
        const themeId = new URL(request.url).searchParams.get('themeId')

        // テーマ詳細: 設問一覧 + 記事を返す
        if (themeId) {
            const theme = await prisma.theme.findUnique({
                where: { id: themeId },
                include: {
                    questions: { orderBy: { order: 'asc' } },
                    article: true,
                },
            })
            if (!theme) {
                return NextResponse.json(
                    { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
                    { status: 404 }
                )
            }
            return NextResponse.json({ success: true, data: { theme } })
        }

        // 一覧
        const [inviteCodes, themes, schools] = await Promise.all([
            prisma.inviteCode.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                    id: true,
                    code: true,
                    usedBy: true,
                    expiresAt: true,
                    createdAt: true,
                },
            }),
            prisma.theme.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    createdAt: true,
                    _count: { select: { questions: true } },
                },
            }),
            prisma.school.findMany({
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    status: true,
                    _count: { select: { teachers: true, sessions: true } },
                },
            }),
        ])

        return NextResponse.json({
            success: true,
            data: { inviteCodes, themes, schools },
        })
    } catch (error) {
        console.error('Ops GET error:', error instanceof Error ? error.message : error)
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'データ取得に失敗しました' } },
            { status: 500 }
        )
    }
}

// ---------- POST: アクション実行 ----------
const generateInviteSchema = z.object({
    action: z.literal('generate_invites'),
    count: z.number().int().min(1).max(20).default(3),
    expiresInDays: z.number().int().min(1).max(365).default(90),
})

const createThemeSchema = z.object({
    action: z.literal('create_theme'),
    title: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    questions: z.array(z.string().min(1).max(1000)).min(1).max(50).optional(),
})

const addQuestionsSchema = z.object({
    action: z.literal('add_questions'),
    themeId: z.string().uuid(),
    questions: z.array(z.string().min(1).max(1000)).min(1).max(50),
})

const imageSchema = z.object({
    url: z.string().max(2000).optional(),
    alt: z.string().max(500).optional(),
    caption: z.string().max(500).optional(),
}).optional()

const techSchema = z.object({
    name: z.string().max(255),
    oneliner: z.string().max(200),
    bodyParagraphs: z.array(z.string()).max(4),
})

const sfRefSchema = z.object({
    title: z.string().max(255),
    author: z.string().max(255),
    body: z.string().max(1000),
})

const saveArticleSchema = z.object({
    action: z.literal('save_article'),
    themeId: z.string().uuid(),
    title: z.string().min(1).max(255),
    subtitle: z.string().max(500).optional(),
    category: z.string().min(1).max(255),
    content: z.object({
        catchcopy: z.string().max(200).optional(),
        vignettes: z.array(z.string().max(500)).max(5).optional(),
        problemParagraphs: z.array(z.string()).max(4).optional(),
        goalParagraphs: z.array(z.string()).max(4).optional(),
        techs: z.array(techSchema).max(5).optional(),
        challengeParagraphs: z.array(z.string()).max(4).optional(),
        sfIntro: z.string().max(500).optional(),
        sfReferences: z.array(sfRefSchema).max(3).optional(),
        sfConnection: z.string().max(500).optional(),
        closingQuestion: z.string().max(500).optional(),
        sources: z.string().max(3000).optional(),
        images: z.object({
            hero: imageSchema,
            transition: imageSchema,
            tech1: imageSchema,
            tech2: imageSchema,
            tech3: imageSchema,
            closing: imageSchema,
        }).optional(),
    }),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

export async function POST(request: NextRequest) {
    if (!verifyOpsSecret(request)) return unauthorized()

    try {
        const body = await request.json()
        const action = body?.action

        // --- 招待コード生成 ---
        if (action === 'generate_invites') {
            const input = generateInviteSchema.parse(body)
            const codes: string[] = []

            for (let i = 0; i < input.count; i++) {
                const code = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
                await prisma.inviteCode.create({
                    data: {
                        code,
                        expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
                    },
                })
                codes.push(code)
            }

            return NextResponse.json({
                success: true,
                data: { codes, expiresInDays: input.expiresInDays },
            })
        }

        // --- テーマ作成（設問付き） ---
        if (action === 'create_theme') {
            const input = createThemeSchema.parse(body)
            const theme = await prisma.theme.create({
                data: {
                    title: input.title,
                    description: input.description || null,
                    status: 'ACTIVE',
                },
            })

            if (input.questions && input.questions.length > 0) {
                await prisma.question.createMany({
                    data: input.questions.map((text, i) => ({
                        themeId: theme.id,
                        questionText: text,
                        order: i + 1,
                        questionType: 'YES_NO_UNKNOWN' as const,
                    })),
                })
            }

            return NextResponse.json({
                success: true,
                data: { theme: { id: theme.id, title: theme.title }, questionCount: input.questions?.length || 0 },
            })
        }

        // --- 既存テーマに設問追加 ---
        if (action === 'add_questions') {
            const input = addQuestionsSchema.parse(body)
            const theme = await prisma.theme.findUnique({ where: { id: input.themeId }, select: { id: true } })
            if (!theme) {
                return NextResponse.json(
                    { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
                    { status: 404 }
                )
            }

            // 既存の最大 order を取得
            const maxOrder = await prisma.question.aggregate({
                where: { themeId: input.themeId },
                _max: { order: true },
            })
            const startOrder = (maxOrder._max.order || 0) + 1

            await prisma.question.createMany({
                data: input.questions.map((text, i) => ({
                    themeId: input.themeId,
                    questionText: text,
                    order: startOrder + i,
                    questionType: 'YES_NO_UNKNOWN' as const,
                })),
            })

            return NextResponse.json({
                success: true,
                data: { addedCount: input.questions.length, startOrder },
            })
        }

        // --- 記事の保存（upsert） ---
        if (action === 'save_article') {
            const input = saveArticleSchema.parse(body)
            const theme = await prisma.theme.findUnique({ where: { id: input.themeId }, select: { id: true } })
            if (!theme) {
                return NextResponse.json(
                    { success: false, error: { code: 'NOT_FOUND', message: 'テーマが見つかりません' } },
                    { status: 404 }
                )
            }

            const article = await prisma.article.upsert({
                where: { themeId: input.themeId },
                create: {
                    themeId: input.themeId,
                    title: input.title,
                    subtitle: input.subtitle || null,
                    category: input.category,
                    content: input.content,
                    status: input.status || 'DRAFT',
                },
                update: {
                    title: input.title,
                    subtitle: input.subtitle || null,
                    category: input.category,
                    content: input.content,
                    status: input.status || undefined,
                },
            })

            return NextResponse.json({
                success: true,
                data: { article: { id: article.id, title: article.title, status: article.status } },
            })
        }

        return NextResponse.json(
            { success: false, error: { code: 'INVALID_ACTION', message: `不明なアクション: ${action}` } },
            { status: 400 }
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors.map(e => e.message).join(', ') } },
                { status: 400 }
            )
        }
        console.error('Ops POST error:', error instanceof Error ? error.message : error)
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '操作に失敗しました' } },
            { status: 500 }
        )
    }
}
