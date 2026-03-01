/**
 * Auto-grouping algorithm
 * Groups students by shared topic preferences (2~4 members per group)
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
 *
 * Algorithm:
 *  1. Build buckets: themeId → { first-choice students, second-choice students }
 *  2. Process buckets by popularity (most first-choice picks first)
 *  3. Fill groups of 2-4 from first-choice students
 *  4. Assign remaining students via second-choice
 *  5. Handle stragglers (merge singletons into smallest compatible group)
 */
export function autoGroup(prefs: StudentPref[]): GroupResult[] {
    if (prefs.length === 0) return []

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
        // A, B, C, ... Z, AA, AB, ...
        let n = groupCount
        let name = ''
        while (n > 0) {
            n--
            name = String.fromCharCode(65 + (n % 26)) + name
            n = Math.floor(n / 26)
        }
        return `グループ${name}`
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
        // Shuffle for fairness
        shuffle(unassigned)

        while (unassigned.length >= MIN) {
            const size = Math.min(MAX, unassigned.length)
            // If remaining after this group would be 1, take one fewer
            const remaining = unassigned.length - size
            const take = remaining === 1 ? Math.min(size + 1, MAX) : size
            const group = unassigned.splice(0, Math.min(take, unassigned.length))
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
        // Cluster stragglers together by second-choice theme
        const stragBucket = new Map<string, string[]>()
        for (const id of stillUnassigned) {
            const pref = prefs.find(p => p.studentId === id)!
            const key = pref.secondChoice
            if (!stragBucket.has(key)) stragBucket.set(key, [])
            stragBucket.get(key)!.push(id)
        }

        for (const [themeId, students] of stragBucket) {
            if (students.length >= MIN) {
                while (students.length >= MIN) {
                    const take = Math.min(MAX, students.length)
                    createGroup(themeId, students.splice(0, take))
                }
            }
        }

        // Absolute last resort — merge any remaining into smallest group
        const finalStraggle = prefs
            .map(p => p.studentId)
            .filter(id => !assigned.has(id))

        for (const id of finalStraggle) {
            const smallest = groups
                .filter(g => g.memberIds.length < MAX)
                .sort((a, b) => a.memberIds.length - b.memberIds.length)[0]
            if (smallest) {
                smallest.memberIds.push(id)
                assigned.add(id)
            } else {
                // All groups full — create a special group
                const pref = prefs.find(p => p.studentId === id)!
                createGroup(pref.firstChoice, [id])
            }
        }
    }

    // --- Step 5: Post-process — merge single-member groups ---
    const singles = groups.filter(g => g.memberIds.length < MIN)
    for (const sg of singles) {
        const target = groups.find(g =>
            g !== sg &&
            g.memberIds.length < MAX &&
            g.memberIds.length >= MIN
        )
        if (target) {
            target.memberIds.push(...sg.memberIds)
            sg.memberIds = [] // mark for removal
        }
    }

    return groups.filter(g => g.memberIds.length >= 1)
}

function shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
}
