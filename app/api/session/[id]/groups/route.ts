import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { autoGroup, StudentPref } from '@/lib/grouping'

// Verify teacher auth (simplified — same pattern as other admin endpoints)
async function verifyTeacher(request: NextRequest): Promise<string | null> {
    const token = request.cookies.get('teacherToken')?.value
    if (!token) return null
    try {
        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(process.env.JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)
        return payload.teacherId as string
    } catch {
        return null
    }
}

// GET: グループ一覧取得
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const teacherId = await verifyTeacher(request)
    if (!teacherId) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const sessionId = params.id

    // Verify session belongs to teacher
    const session = await prisma.session.findFirst({
        where: { id: sessionId, teacherId },
    })
    if (!session) {
        return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
    }

    // Get groups with members
    const groups = await prisma.studentGroup.findMany({
        where: { sessionId },
        include: {
            theme: { select: { id: true, title: true } },
            members: {
                include: {
                    student: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { name: 'asc' },
    })

    // Get selection status
    const totalStudents = await prisma.student.count({ where: { sessionId } })
    const studentsWithPrefs = await prisma.topicPreference.groupBy({
        by: ['studentId'],
        where: { sessionId },
    })

    return NextResponse.json({
        success: true,
        data: {
            groups: groups.map(g => ({
                id: g.id,
                name: g.name,
                theme: g.theme,
                members: g.members.map(m => ({
                    id: m.student.id,
                    name: m.student.name,
                })),
            })),
            selectionStatus: {
                total: totalStudents,
                selected: studentsWithPrefs.length,
            },
        },
    })
}

// POST: 自動グルーピング実行
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const teacherId = await verifyTeacher(request)
    if (!teacherId) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const sessionId = params.id

    // Verify session
    const session = await prisma.session.findFirst({
        where: { id: sessionId, teacherId },
    })
    if (!session) {
        return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
    }

    // Get all preferences for this session
    const allPrefs = await prisma.topicPreference.findMany({
        where: { sessionId },
        orderBy: [{ studentId: 'asc' }, { rank: 'asc' }],
    })

    // Build StudentPref list (group by studentId)
    const prefMap = new Map<string, { first?: string; second?: string }>()
    for (const p of allPrefs) {
        if (!prefMap.has(p.studentId)) prefMap.set(p.studentId, {})
        const entry = prefMap.get(p.studentId)!
        if (p.rank === 1) entry.first = p.themeId
        if (p.rank === 2) entry.second = p.themeId
    }

    const studentPrefs: StudentPref[] = []
    for (const [studentId, choices] of prefMap) {
        if (choices.first && choices.second) {
            studentPrefs.push({
                studentId,
                firstChoice: choices.first,
                secondChoice: choices.second,
            })
        }
    }

    if (studentPrefs.length < 2) {
        return NextResponse.json({
            success: false,
            error: { code: 'INSUFFICIENT', message: 'グルーピングには最低2人の選択が必要です' },
        }, { status: 400 })
    }

    // Run grouping algorithm
    const groupResults = autoGroup(studentPrefs)

    // Save to DB (delete old groups first, then create new)
    await prisma.$transaction(async (tx) => {
        // Delete existing groups for this session
        await tx.studentGroupMember.deleteMany({
            where: { group: { sessionId } },
        })
        await tx.studentGroup.deleteMany({
            where: { sessionId },
        })

        // Create new groups
        for (const g of groupResults) {
            const group = await tx.studentGroup.create({
                data: {
                    sessionId,
                    name: g.name,
                    themeId: g.themeId,
                },
            })
            await tx.studentGroupMember.createMany({
                data: g.memberIds.map(studentId => ({
                    groupId: group.id,
                    studentId,
                })),
            })
        }
    })

    // Fetch the created groups with full data
    const created = await prisma.studentGroup.findMany({
        where: { sessionId },
        include: {
            theme: { select: { id: true, title: true } },
            members: {
                include: {
                    student: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { name: 'asc' },
    })

    return NextResponse.json({
        success: true,
        data: {
            groupCount: created.length,
            groups: created.map(g => ({
                id: g.id,
                name: g.name,
                theme: g.theme,
                members: g.members.map(m => ({
                    id: m.student.id,
                    name: m.student.name,
                })),
            })),
        },
    })
}
