'use client'

import type { ReactNode } from 'react'

// ─── Section wrapper ──────────────────────────────────

function SectionShell({
    tag,
    title,
    children,
    center,
}: {
    tag: string
    title?: string
    children: ReactNode
    center?: boolean
}) {
    return (
        <div
            className={`rounded-xl border border-student-border-primary bg-student-bg-secondary p-6 md:p-8${center ? ' text-center' : ''}`}
        >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-student-text-disabled">{tag}</p>
            {title && <h3 className="mt-2 text-lg font-semibold text-student-text-primary">{title}</h3>}
            {children}
        </div>
    )
}

// ─── Section type definitions ─────────────────────────

export type BriefingSection =
    | { type: 'overview'; title: string; summary: string }
    | { type: 'invitation'; paragraphs: string[] }
    | { type: 'sfWorks'; works: { title: string; author: string; reason: string; url: string }[] }
    | { type: 'scenes'; opening: string[]; scenes: { title: string; body: string }[] }
    | { type: 'perspectives'; items: { role: string; insight: string }[] }
    | { type: 'projects'; projects: { title: string; note: string; sourceLabel: string; url: string }[] }
    | { type: 'quote'; text: string; sourceLabel: string; url?: string }
    | { type: 'keywords'; tags: string[]; glossary: { term: string; meaning: string }[] }
    | { type: 'custom'; tag: string; title: string; body: string }
    | { type: 'cards'; tag: string; title: string; cards: { heading: string; body: string }[] }

// ─── Individual renderers ─────────────────────────────

function OverviewSection({ title, summary }: Extract<BriefingSection, { type: 'overview' }>) {
    return (
        <SectionShell tag="Theme Overview">
            <h2 className="mt-2 font-heading text-2xl font-bold text-student-text-primary">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-student-text-secondary">{summary}</p>
        </SectionShell>
    )
}

function InvitationSection({ paragraphs }: Extract<BriefingSection, { type: 'invitation' }>) {
    if (paragraphs.length === 0) return null
    return (
        <SectionShell tag="Invitation" title="あなたへの問いかけ">
            <div className="mt-4 space-y-4">
                {paragraphs.map((p, i) => (
                    <p
                        key={i}
                        className="border-l-2 border-student-border-secondary pl-4 text-sm leading-7 text-student-text-secondary italic"
                    >
                        {p}
                    </p>
                ))}
            </div>
        </SectionShell>
    )
}

function SfWorksSection({ works }: Extract<BriefingSection, { type: 'sfWorks' }>) {
    if (works.length === 0) return null
    return (
        <SectionShell tag="SF References" title="このテーマを考えるためのSF作品">
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                {works.map((work) => (
                    <div
                        key={work.title}
                        className="rounded-lg border border-student-border-secondary bg-student-bg-tertiary p-4"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="font-semibold text-student-text-primary">{work.title}</h4>
                                <p className="mt-0.5 text-xs text-student-text-disabled">{work.author}</p>
                            </div>
                            {work.url && (
                                <a
                                    href={work.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 flex-shrink-0 text-xs text-student-text-disabled transition-colors hover:text-student-text-secondary"
                                >
                                    →
                                </a>
                            )}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-student-text-secondary">{work.reason}</p>
                    </div>
                ))}
            </div>
        </SectionShell>
    )
}

function ScenesSection({ opening, scenes }: Extract<BriefingSection, { type: 'scenes' }>) {
    return (
        <SectionShell tag="Scenes" title="未来のくらしを想像する">
            <div className="mt-4 space-y-4 text-sm leading-7 text-student-text-secondary">
                {opening.map((p) => (
                    <p key={p}>{p}</p>
                ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                {scenes.map((scene) => (
                    <div
                        key={scene.title}
                        className="rounded-lg border border-student-border-secondary bg-student-bg-tertiary p-4"
                    >
                        <h4 className="text-sm font-semibold text-student-text-primary">{scene.title}</h4>
                        <p className="mt-2 text-sm text-student-text-secondary">{scene.body}</p>
                    </div>
                ))}
            </div>
        </SectionShell>
    )
}

function PerspectivesSection({ items }: Extract<BriefingSection, { type: 'perspectives' }>) {
    if (items.length === 0) return null
    return (
        <SectionShell tag="Perspectives" title="考える視点">
            <ul className="mt-4 space-y-3 text-sm text-student-text-secondary">
                {items.map((item) => (
                    <li key={`${item.role}-${item.insight}`} className="flex gap-3">
                        <span className="flex-shrink-0 rounded-md bg-student-bg-tertiary px-2 py-0.5 text-xs font-medium text-student-text-primary">
                            {item.role}
                        </span>
                        <span>{item.insight}</span>
                    </li>
                ))}
            </ul>
        </SectionShell>
    )
}

function ProjectsSection({ projects }: Extract<BriefingSection, { type: 'projects' }>) {
    if (projects.length === 0) return null
    return (
        <SectionShell tag="Projects" title="実際の研究プロジェクト">
            <div className="mt-4 space-y-3">
                {projects.map((project) => (
                    <div
                        key={project.title}
                        className="rounded-lg border border-student-border-secondary bg-student-bg-tertiary p-4"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-student-text-primary">{project.title}</h4>
                            <a
                                href={project.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 rounded bg-student-bg-primary px-2 py-0.5 text-[10px] text-student-text-disabled transition-colors hover:text-student-text-secondary"
                            >
                                {project.sourceLabel} →
                            </a>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-student-text-secondary">{project.note}</p>
                    </div>
                ))}
            </div>
        </SectionShell>
    )
}

function QuoteSection({ text, sourceLabel }: Extract<BriefingSection, { type: 'quote' }>) {
    return (
        <SectionShell tag="Quote" center>
            <blockquote className="mt-2 font-heading text-lg italic text-student-text-primary">
                &ldquo;{text}&rdquo;
            </blockquote>
            <p className="mt-2 text-xs text-student-text-disabled">— {sourceLabel}</p>
        </SectionShell>
    )
}

function KeywordsSection({ tags, glossary }: Extract<BriefingSection, { type: 'keywords' }>) {
    return (
        <SectionShell tag="Keywords" title="キーワード">
            {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((keyword) => (
                        <span
                            key={keyword}
                            className="rounded-full border border-student-border-secondary bg-student-bg-tertiary px-3 py-1 text-xs text-student-text-secondary"
                        >
                            {keyword}
                        </span>
                    ))}
                </div>
            )}
            {glossary.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-student-text-secondary">
                    {glossary.map((item) => (
                        <li key={item.term}>
                            <span className="font-medium text-student-text-primary">{item.term}:</span> {item.meaning}
                        </li>
                    ))}
                </ul>
            )}
        </SectionShell>
    )
}

function CustomSection({ tag, title, body }: Extract<BriefingSection, { type: 'custom' }>) {
    return (
        <SectionShell tag={tag} title={title}>
            <p className="mt-4 text-sm leading-7 text-student-text-secondary">{body}</p>
        </SectionShell>
    )
}

function CardsSection({ tag, title, cards }: Extract<BriefingSection, { type: 'cards' }>) {
    if (cards.length === 0) return null
    return (
        <SectionShell tag={tag} title={title}>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                {cards.map((card) => (
                    <div
                        key={card.heading}
                        className="rounded-lg border border-student-border-secondary bg-student-bg-tertiary p-4"
                    >
                        <h4 className="text-sm font-semibold text-student-text-primary">{card.heading}</h4>
                        <p className="mt-2 text-sm text-student-text-secondary">{card.body}</p>
                    </div>
                ))}
            </div>
        </SectionShell>
    )
}

// ─── Dispatcher ───────────────────────────────────────

export function renderBriefingSection(section: BriefingSection, index: number) {
    const key = `${section.type}-${index}`
    switch (section.type) {
        case 'overview':
            return <OverviewSection key={key} {...section} />
        case 'invitation':
            return <InvitationSection key={key} {...section} />
        case 'sfWorks':
            return <SfWorksSection key={key} {...section} />
        case 'scenes':
            return <ScenesSection key={key} {...section} />
        case 'perspectives':
            return <PerspectivesSection key={key} {...section} />
        case 'projects':
            return <ProjectsSection key={key} {...section} />
        case 'quote':
            return <QuoteSection key={key} {...section} />
        case 'keywords':
            return <KeywordsSection key={key} {...section} />
        case 'custom':
            return <CustomSection key={key} {...section} />
        case 'cards':
            return <CardsSection key={key} {...section} />
        default:
            return null
    }
}
