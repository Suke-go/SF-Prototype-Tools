import type { BriefingSection } from '@/components/briefing/BriefingSections'

/**
 * OPS 記事エディタで生成した Article の JSON content を
 * briefing ページの BriefingSection[] に変換する。
 *
 * Article content の構造:
 *   catchcopy, vignettes[], problemParagraphs[], goalParagraphs[],
 *   techs[{name, oneliner, bodyParagraphs[]}], challengeParagraphs[],
 *   sfIntro, sfReferences[{title, author, body}],
 *   sfConnection, closingQuestion, sources
 */

type ArticleContent = {
    catchcopy?: string
    vignettes?: string[]
    problemParagraphs?: string[]
    goalParagraphs?: string[]
    techs?: { name: string; oneliner: string; bodyParagraphs: string[] }[]
    challengeParagraphs?: string[]
    sfIntro?: string
    sfReferences?: { title: string; author: string; body: string }[]
    sfConnection?: string
    closingQuestion?: string
    sources?: string
}

export function buildArticleSections(
    articleTitle: string,
    articleSubtitle: string | undefined,
    content: ArticleContent,
): BriefingSection[] {
    const sections: BriefingSection[] = []

    // 1. Overview from article title
    sections.push({
        type: 'overview',
        title: articleTitle,
        summary: articleSubtitle || '',
    })

    // 2. Vignettes as invitation
    const vignetteText = [
        content.catchcopy,
        ...(content.vignettes?.filter(Boolean) || []),
    ].filter(Boolean) as string[]
    if (vignetteText.length > 0) {
        sections.push({
            type: 'invitation',
            paragraphs: vignetteText,
        })
    }

    // 3. Problem paragraphs as custom section
    if (content.problemParagraphs?.some(Boolean)) {
        sections.push({
            type: 'custom',
            tag: 'PROBLEM',
            title: '課題',
            body: content.problemParagraphs.filter(Boolean).join('\n\n'),
        })
    }

    // 4. Goal paragraphs as custom section
    if (content.goalParagraphs?.some(Boolean)) {
        sections.push({
            type: 'custom',
            tag: 'GOAL',
            title: '目標',
            body: content.goalParagraphs.filter(Boolean).join('\n\n'),
        })
    }

    // 5. Technologies as cards
    const validTechs = content.techs?.filter(t => t.name) || []
    if (validTechs.length > 0) {
        sections.push({
            type: 'cards',
            tag: 'TECHNOLOGY',
            title: '注目の技術',
            cards: validTechs.map(t => ({
                heading: `${t.name}${t.oneliner ? ` — ${t.oneliner}` : ''}`,
                body: t.bodyParagraphs?.filter(Boolean).join('\n\n') || '',
            })),
        })
    }

    // 6. Challenge paragraphs
    if (content.challengeParagraphs?.some(Boolean)) {
        sections.push({
            type: 'custom',
            tag: 'CHALLENGE',
            title: '挑戦と課題',
            body: content.challengeParagraphs.filter(Boolean).join('\n\n'),
        })
    }

    // 7. SF References
    const validSfRefs = content.sfReferences?.filter(r => r.title) || []
    if (validSfRefs.length > 0) {
        const works = validSfRefs.map(r => ({
            title: r.title,
            author: r.author,
            reason: r.body,
            url: '',
        }))
        sections.push({
            type: 'sfWorks',
            works,
        })
    }

    // 7b. SF Intro as custom section
    if (content.sfIntro) {
        sections.push({
            type: 'custom',
            tag: 'SF INTRO',
            title: 'SFプロトタイピングとは',
            body: content.sfIntro,
        })
    }

    // 7c. SF Connection
    if (content.sfConnection) {
        sections.push({
            type: 'custom',
            tag: 'SF CONNECTION',
            title: 'SFとの接点',
            body: content.sfConnection,
        })
    }

    // 8. Closing question
    if (content.closingQuestion) {
        sections.push({
            type: 'quote',
            text: content.closingQuestion,
            sourceLabel: '考えてみよう',
        })
    }

    // 9. Sources
    if (content.sources) {
        sections.push({
            type: 'custom',
            tag: 'SOURCES',
            title: '参考文献',
            body: content.sources,
        })
    }

    return sections
}
