import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: テーマに紐づく PUBLISHED 記事を取得
export async function GET(
    request: NextRequest,
    { params }: { params: { themeId: string } }
) {
    const themeId = params.themeId
    if (!themeId) {
        return NextResponse.json(
            { success: false, error: { code: 'INVALID_INPUT', message: 'themeId が必要です' } },
            { status: 400 }
        )
    }

    try {
        const article = await prisma.article.findUnique({
            where: { themeId },
            select: {
                id: true,
                title: true,
                subtitle: true,
                category: true,
                content: true,
                status: true,
                theme: { select: { id: true, title: true } },
            },
        })

        if (!article || article.status !== 'PUBLISHED') {
            return NextResponse.json({
                success: true,
                data: { article: null },
            })
        }

        return NextResponse.json({
            success: true,
            data: { article },
        })
    } catch (error) {
        console.error('Article fetch error:', error)
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: '記事取得に失敗しました' } },
            { status: 500 }
        )
    }
}
