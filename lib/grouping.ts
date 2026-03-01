/**
 * Auto-grouping algorithm v2
 * Groups students by shared topic preferences (2~4 members per group)
 *
 * Rules:
 *  - 参加者3人以下 → 全員で1グループ
 *  - 2人組はOK、1人余りは避ける
 *  - テーマ食い違い → 多数決でテーマ決定
 *  - グループ名は数字 (1, 2, 3...)
 */

export type StudentPref = {
    studentId: string
    firstChoice: string   // themeId
    secondChoice: string  // themeId
}

export type GroupResult = {
    themeId: string
    name: string
    memberIds: string[]
}

const MIN = 2
const MAX = 4

/**
 * Given a list of student preferences, produce groups of 2-4 students
 * who share a common topic preference.
 */
export function autoGroup(prefs: StudentPref[]): GroupResult[] {
    if (prefs.length === 0) return []

    // --- Special case: 3 or fewer → single group ---
    if (prefs.length <= 3) {
        const themeId = majorityTheme(prefs)
        return [{
            themeId,
            name: 'グループ1',
            memberIds: prefs.map(p => p.studentId),
        }]
    }

    // --- Step 1: Build buckets ---
    const firstBucket = new Map<string, string[]>()   // themeId → studentIds
    const secondBucket = new Map<string, string[]>()

    for (const p of prefs) {
        if (!firstBucket.has(p.firstChoice)) firstBucket.set(p.firstChoice, [])
        firstBucket.get(p.firstChoice)!.push(p.studentId)
        if (!secondBucket.has(p.secondChoice)) secondBucket.set(p.secondChoice, [])
        secondBucket.get(p.secondChoice)!.push(p.studentId)
    }

    const assigned = new Set<string>()
    const groups: GroupResult[] = []
    let groupCount = 0

    function nextName() {
        groupCount++
        return `グループ${groupCount}`
    }

    function createGroup(themeId: string, memberIds: string[]) {
        groups.push({ themeId, name: nextName(), memberIds })
        for (const id of memberIds) assigned.add(id)
    }

    // --- Step 2: Process first-choice buckets (largest first) ---
    const sortedThemes = [...firstBucket.entries()]
        .sort((a, b) => b[1].length - a[1].length)

    for (const [themeId, students] of sortedThemes) {
        const unassigned = students.filter(id => !assigned.has(id))
        shuffle(unassigned)

        while (unassigned.length >= MIN) {
            // Decide group size: avoid leaving exactly 1 person
            let take = Math.min(MAX, unassigned.length)
            const remaining = unassigned.length - take
            if (remaining === 1 && take > MIN) {
                // Take one fewer so remaining = 2 (a valid pair)
                take = take - 1
            } else if (remaining === 1 && take === MIN) {
                // Take all 3 (MIN+1) instead of leaving 1
                take = Math.min(unassigned.length, MAX)
            }
            const group = unassigned.splice(0, take)
            if (group.length >= MIN) {
                createGroup(themeId, group)
            }
        }
    }

    // --- Step 3: Assign remaining via second-choice ---
    const unassignedAll = prefs
        .map(p => p.studentId)
        .filter(id => !assigned.has(id))

    for (const studentId of unassignedAll) {
        const pref = prefs.find(p => p.studentId === studentId)
        if (!pref) continue

        // Try to join existing group with matching theme (under MAX)
        const matchingGroup = groups.find(g =>
            (g.themeId === pref.secondChoice || g.themeId === pref.firstChoice) &&
            g.memberIds.length < MAX
        )
        if (matchingGroup) {
            matchingGroup.memberIds.push(studentId)
            assigned.add(studentId)
        }
    }

    // --- Step 4: Handle remaining stragglers ---
    const stillUnassigned = prefs
        .map(p => p.studentId)
        .filter(id => !assigned.has(id))

    if (stillUnassigned.length > 0) {
        // Cluster stragglers by second-choice
        const stragBucket = new Map<string, string[]>()
        for (const id of stillUnassigned) {
            const pref = prefs.find(p => p.studentId === id)!
            const key = pref.secondChoice
            if (!stragBucket.has(key)) stragBucket.set(key, [])
            stragBucket.get(key)!.push(id)
        }

        for (const [themeId, students] of stragBucket) {
            while (students.length >= MIN) {
                let take = Math.min(MAX, students.length)
                const remaining = students.length - take
                if (remaining === 1 && take > MIN) take--
                createGroup(themeId, students.splice(0, take))
            }
        }

        // Last resort — merge remaining into smallest group (avoid singletons)
        const finalStraggle = prefs.map(p => p.studentId).filter(id => !assigned.has(id))

        if (finalStraggle.length === 1) {
            // Single straggler: add to smallest group that has room
            const smallest = groups
                .filter(g => g.memberIds.length < MAX)
                .sort((a, b) => a.memberIds.length - b.memberIds.length)[0]
            if (smallest) {
                smallest.memberIds.push(finalStraggle[0])
                assigned.add(finalStraggle[0])
            } else {
                // All full → find the group closest to MAX and add anyway (5 is OK as last resort)
                const any = groups.sort((a, b) => a.memberIds.length - b.memberIds.length)[0]
                if (any) {
                    any.memberIds.push(finalStraggle[0])
                    assigned.add(finalStraggle[0])
                }
            }
        } else if (finalStraggle.length >= MIN) {
            // Enough to form a group — use majority theme
            const stragPrefs = finalStraggle.map(id => prefs.find(p => p.studentId === id)!)
            const themeId = majorityTheme(stragPrefs)
            createGroup(themeId, finalStraggle)
        }
    }

    // --- Step 5: Post-process — no singleton groups ---
    for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i].memberIds.length < MIN) {
            const sg = groups[i]
            const target = groups.find(g =>
                g !== sg &&
                g.memberIds.length < MAX
            )
            if (target) {
                target.memberIds.push(...sg.memberIds)
                groups.splice(i, 1)
            }
        }
    }

    // Renumber groups sequentially
    for (let i = 0; i < groups.length; i++) {
        groups[i].name = `グループ${i + 1}`
    }

    return groups
}

/**
 * Majority vote: pick the most popular theme among the given preferences.
 * Counts first-choice and second-choice separately, first-choice wins ties.
 */
function majorityTheme(prefs: StudentPref[]): string {
    const counts = new Map<string, number>()
    for (const p of prefs) {
        counts.set(p.firstChoice, (counts.get(p.firstChoice) || 0) + 2) // first-choice = double weight
        counts.set(p.secondChoice, (counts.get(p.secondChoice) || 0) + 1)
    }
    let best = prefs[0].firstChoice
    let bestCount = 0
    for (const [theme, count] of counts) {
        if (count > bestCount) {
            bestCount = count
            best = theme
        }
    }
    return best
}

function shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
}
