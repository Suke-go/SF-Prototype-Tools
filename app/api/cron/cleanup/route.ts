import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    // Vercel Cron の認証（CRON_SECRET ヘッダーチェック）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

        // COMPLETED または ARCHIVED で 90日以上経過したセッションを削除
        // CASCADE により関連する students, responses, learningLogs 等も削除される
        const deleted = await prisma.session.deleteMany({
            where: {
                status: { in: ['COMPLETED', 'ARCHIVED'] },
                updatedAt: { lt: ninetyDaysAgo },
            },
        })

        // 期限切れ招待コードの削除
        const deletedInvites = await prisma.inviteCode.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
                usedBy: { not: null },
            },
        })

        console.log(`Cleanup: deleted ${deleted.count} sessions, ${deletedInvites.count} expired invite codes`)

        return NextResponse.json({
            success: true,
            deletedSessions: deleted.count,
            deletedInviteCodes: deletedInvites.count,
        })
    } catch (error) {
        console.error('Cleanup cron error:', error instanceof Error ? error.message : error)
        return NextResponse.json(
            { success: false, error: 'Cleanup failed' },
            { status: 500 }
        )
    }
}
