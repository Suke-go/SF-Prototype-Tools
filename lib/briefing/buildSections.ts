import type { MoonshotGoal } from '@/lib/moonshot/catalog'
import type { BriefingSection } from '@/components/briefing/BriefingSections'

type StoryData = {
    opening: string[]
    socialScenes: { title: string; body: string }[]
    insightExamples: { role: string; insight: string }[]
    glossary: { term: string; meaning: string }[]
}

/**
 * Build the ordered list of briefing sections for a given goal.
 *
 * To add, remove, or reorder sections, edit this function.
 * To add a completely new section type, add it to BriefingSection
 * in BriefingSections.tsx and add a renderer there.
 *
 * For quick one-off sections, use `{ type: 'custom' }` or `{ type: 'cards' }`.
 */
export function buildBriefingSections(
    goal: MoonshotGoal,
    story: StoryData,
): BriefingSection[] {
    const sections: BriefingSection[] = []

    // 1. Theme overview (always present)
    sections.push({
        type: 'overview',
        title: goal.title,
        summary: goal.summary,
    })

    // 2. Invitation hook
    if (goal.invitation && goal.invitation.length > 0) {
        sections.push({
            type: 'invitation',
            paragraphs: goal.invitation,
        })
    }

    // 3. SF works
    if (goal.sfWorks && goal.sfWorks.length > 0) {
        sections.push({
            type: 'sfWorks',
            works: goal.sfWorks,
        })
    }

    // 4. Social scenes from stories.json
    sections.push({
        type: 'scenes',
        opening: story.opening,
        scenes: story.socialScenes,
    })

    // 5. Perspectives
    if (story.insightExamples.length > 0) {
        sections.push({
            type: 'perspectives',
            items: story.insightExamples,
        })
    }

    // 6. Research projects
    if (goal.projects && goal.projects.length > 0) {
        sections.push({
            type: 'projects',
            projects: goal.projects,
        })
    }

    // 7. Quote
    if (goal.quote) {
        sections.push({
            type: 'quote',
            text: goal.quote.text,
            sourceLabel: goal.quote.sourceLabel,
            url: goal.quote.url,
        })
    }

    // 8. Keywords + glossary
    sections.push({
        type: 'keywords',
        tags: goal.keywords || [],
        glossary: story.glossary,
    })

    return sections
}
