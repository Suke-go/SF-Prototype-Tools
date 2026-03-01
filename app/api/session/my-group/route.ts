import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 生徒が自分のグループを確認
export async function GET(request: NextRequest) {
    try {
        const studentToken = request.cookies.get('studentToken')?.value
        if (!studentToken) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
                { status: 401 }
            )
        }

        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(process.env.JWT_SECRET)
        let studentId: string
        try {
            const { payload } = await jwtVerify(studentToken, secret)
            studentId = payload.studentId as string
        } catch {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED' } },
                { status: 401 }
            )
        }

        const sessionId = new URL(request.url).searchParams.get('sessionId')
        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: { code: 'MISSING_PARAM', message: 'sessionId が必要です' } },
                { status: 400 }
            )
        }

        // Find group membership for this student in this session
        const membership = await prisma.studentGroupMember.findFirst({
            where: {
                studentId,
                group: { sessionId },
            },
            include: {
                group: {
                    include: {
                        theme: { select: { id: true, title: true } },
                        members: {
                            include: {
                                student: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        })

        if (!membership) {
            return NextResponse.json({
                success: true,
                data: { group: null },
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                group: {
                    id: membership.group.id,
                    name: membership.group.name,
                    theme: membership.group.theme,
                    members: membership.group.members.map((m: { student: { id: string; name: string | null } }) => ({
                        id: m.student.id,
                        name: m.student.name,
                        isMe: m.student.id === studentId,
                    })),
                },
            },
        })
    } catch (error) {
        console.error('My group error:', error)
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL', message: 'グループ取得に失敗しました' } },
            { status: 500 }
        )
    }
}
