'use client'

import { useCallback, useEffect, useState } from 'react'
import '../ops.css'

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
    images?: Record<string, { url?: string; alt?: string; caption?: string }>
}

type ThemeOption = { id: string; title: string; _count: { questions: number } }

const EMPTY_TECH = { name: '', oneliner: '', bodyParagraphs: ['', ''] }
const EMPTY_SF = { title: '', author: '', body: '' }

export default function ArticleEditorPage() {
    const [opsKey, setOpsKey] = useState('')
    const [authenticated, setAuthenticated] = useState(false)
    const [themes, setThemes] = useState<ThemeOption[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [preprocessedInput, setPreprocessedInput] = useState('')
    const [pipelineStep, setPipelineStep] = useState<string>('full_article')
    const [stepOutput, setStepOutput] = useState('')
    const [provider, setProvider] = useState<'openai' | 'gemini'>('openai')
    const [showPrompt, setShowPrompt] = useState(false)
    const [promptText, setPromptText] = useState('')
    const [promptEdited, setPromptEdited] = useState(false)
    const [modelOverride, setModelOverride] = useState('')

    // Article fields
    const [themeId, setThemeId] = useState('')
    const [title, setTitle] = useState('')
    const [subtitle, setSubtitle] = useState('')
    const [category, setCategory] = useState('')
    const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

    // Content fields
    const [catchcopy, setCatchcopy] = useState('')
    const [vignettes, setVignettes] = useState(['', '', '', '', ''])
    const [problemParagraphs, setProblemParagraphs] = useState(['', ''])
    const [goalParagraphs, setGoalParagraphs] = useState(['', ''])
    const [techs, setTechs] = useState([{ ...EMPTY_TECH }, { ...EMPTY_TECH }, { ...EMPTY_TECH }])
    const [challengeParagraphs, setChallengeParagraphs] = useState(['', ''])
    const [sfIntro, setSfIntro] = useState('')
    const [sfRefs, setSfRefs] = useState([{ ...EMPTY_SF }, { ...EMPTY_SF }])
    const [sfConnection, setSfConnection] = useState('')
    const [closingQuestion, setClosingQuestion] = useState('')
    const [sources, setSources] = useState('')

    // Images
    const [images, setImages] = useState<Record<string, { url: string; alt: string; caption: string }>>({
        hero: { url: '', alt: '', caption: '' },
        transition: { url: '', alt: '', caption: '' },
        tech1: { url: '', alt: '', caption: '' },
        tech2: { url: '', alt: '', caption: '' },
        tech3: { url: '', alt: '', caption: '' },
        closing: { url: '', alt: '', caption: '' },
    })

    const fetchData = useCallback(async (key: string) => {
        try {
            const res = await fetch(`/api/ops?key=${encodeURIComponent(key)}`)
            if (res.status === 401) { setError('運用キーが無効です'); return }
            const json = await res.json()
            setThemes(json.data.themes)
            setAuthenticated(true)
        } catch { setError('通信エラー') }
    }, [])

    async function loadArticle(id: string) {
        if (!id) return
        setError(null)
        try {
            const res = await fetch(`/api/ops?key=${encodeURIComponent(opsKey)}&themeId=${id}`)
            const json = await res.json()
            if (!json.success) return
            const article = json.data.theme.article
            if (!article) return // No article yet for this theme
            setTitle(article.title || '')
            setSubtitle(article.subtitle || '')
            setCategory(article.category || '')
            setStatus(article.status || 'DRAFT')
            const c = (article.content || {}) as ArticleContent
            setCatchcopy(c.catchcopy || '')
            setVignettes(padArray(c.vignettes, 5))
            setProblemParagraphs(padArray(c.problemParagraphs, 2))
            setGoalParagraphs(padArray(c.goalParagraphs, 2))
            setTechs(padTechs(c.techs))
            setChallengeParagraphs(padArray(c.challengeParagraphs, 2))
            setSfIntro(c.sfIntro || '')
            setSfRefs(padSfRefs(c.sfReferences))
            setSfConnection(c.sfConnection || '')
            setClosingQuestion(c.closingQuestion || '')
            setSources(c.sources || '')
            if (c.images) {
                setImages(prev => {
                    const updated = { ...prev }
                    for (const [k, v] of Object.entries(c.images!)) {
                        updated[k] = { url: v?.url || '', alt: v?.alt || '', caption: v?.caption || '' }
                    }
                    return updated
                })
            }
        } catch { setError('記事の読み込みに失敗') }
    }

    async function save() {
        if (!themeId || !title.trim() || !category.trim()) { setError('テーマ・タイトル・カテゴリは必須です'); return }
        setSaving(true); setError(null); setSuccess(null)
        try {
            const content: ArticleContent = {
                catchcopy: catchcopy || undefined,
                vignettes: vignettes.filter(Boolean).length > 0 ? vignettes : undefined,
                problemParagraphs: problemParagraphs.filter(Boolean).length > 0 ? problemParagraphs : undefined,
                goalParagraphs: goalParagraphs.filter(Boolean).length > 0 ? goalParagraphs : undefined,
                techs: techs.some(t => t.name) ? techs.filter(t => t.name) : undefined,
                challengeParagraphs: challengeParagraphs.filter(Boolean).length > 0 ? challengeParagraphs : undefined,
                sfIntro: sfIntro || undefined,
                sfReferences: sfRefs.some(s => s.title) ? sfRefs.filter(s => s.title) : undefined,
                sfConnection: sfConnection || undefined,
                closingQuestion: closingQuestion || undefined,
                sources: sources || undefined,
                images: Object.fromEntries(Object.entries(images).filter(([, v]) => v.url)),
            }
            const res = await fetch('/api/ops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-ops-secret': opsKey },
                body: JSON.stringify({ action: 'save_article', themeId, title, subtitle, category, content, status }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error?.message || '保存に失敗')
            setSuccess(`記事「${json.data.article.title}」を保存しました（${json.data.article.status}）`)
        } catch (e) { setError(e instanceof Error ? e.message : '保存エラー') }
        finally { setSaving(false) }
    }

    const STEPS = [
        { id: 'preprocess', label: '⓪ 前処理', prompt: 'preprocess.md', desc: '元テキストを整理・要約' },
        { id: 'intro_sf', label: '① SFヴィネット', prompt: 'intro-sf-writer.md', desc: '背景情報 → 500字のSFつかみ文生成' },
        { id: 'meidai', label: '② 命題生成', prompt: 'meidai.md', desc: 'テーマ → 20問の設問をJSONで生成' },
        { id: 'meidai_review', label: '③ 命題校正', prompt: 'meidai_review.md', desc: '生成された設問を整形' },
        { id: 'article_gen', label: '④ 記事生成', prompt: 'article_gen.md', desc: '背景情報+つかみ文 → 記事本文' },
        { id: 'editor', label: '⑤ 記事校正', prompt: 'editor.md', desc: '記事本文を中高生向けに校正' },
        { id: 'full_article', label: '✨ 一括生成', prompt: 'article_generator.md', desc: '背景情報 → 全フィールドJSON一括生成' },
    ] as const

    // ✨ 全自動生成: テーマIDだけで全フォームを一括生成
    async function runAutoGenerate() {
        if (!themeId) { setError('テーマを選択してください'); return }
        setGenerating(true); setError(null); setSuccess(null); setStepOutput('');
        setPipelineStep('full_article')
        try {
            const res = await fetch('/api/ops/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-ops-secret': opsKey },
                body: JSON.stringify({
                    step: 'full_article',
                    themeId,
                    category: category || undefined,
                    provider,
                    model: modelOverride.trim() || undefined,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error?.message || '生成に失敗')

            if (json.data.parsed) {
                const g = json.data.parsed as Record<string, unknown>
                if (g.title) setTitle(g.title as string)
                if (g.subtitle) setSubtitle(g.subtitle as string)
                if (g.category) setCategory(g.category as string)
                const c = (g.content || {}) as ArticleContent
                if (c.catchcopy) setCatchcopy(c.catchcopy)
                if (c.vignettes) setVignettes(padArray(c.vignettes, 5))
                if (c.problemParagraphs) setProblemParagraphs(padArray(c.problemParagraphs, 2))
                if (c.goalParagraphs) setGoalParagraphs(padArray(c.goalParagraphs, 2))
                if (c.techs) setTechs(padTechs(c.techs))
                if (c.challengeParagraphs) setChallengeParagraphs(padArray(c.challengeParagraphs, 2))
                if (c.sfIntro) setSfIntro(c.sfIntro)
                if (c.sfReferences) setSfRefs(padSfRefs(c.sfReferences))
                if (c.sfConnection) setSfConnection(c.sfConnection)
                if (c.closingQuestion) setClosingQuestion(c.closingQuestion)
                if (c.sources) setSources(c.sources)
                setSuccess('✨ AIが全フィールドを自動生成しました！確認・編集してから保存してください。')
            }
            setStepOutput(json.data.output)
        } catch (e) { setError(e instanceof Error ? e.message : '全自動生成エラー') }
        finally { setGenerating(false) }
    }

    async function runStep() {
        if (!preprocessedInput.trim()) { setError('入力テキストを入力してください'); return }
        setGenerating(true); setError(null); setSuccess(null); setStepOutput('')
        try {
            const res = await fetch('/api/ops/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-ops-secret': opsKey },
                body: JSON.stringify({
                    step: pipelineStep,
                    input: preprocessedInput,
                    category: category || undefined,
                    provider,
                    model: modelOverride.trim() || undefined,
                    customPrompt: promptEdited ? promptText : undefined,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error?.message || '生成に失敗')

            // full_article: フォームに自動入力
            if (pipelineStep === 'full_article' && json.data.parsed) {
                const g = json.data.parsed as Record<string, unknown>
                if (g.title) setTitle(g.title as string)
                if (g.subtitle) setSubtitle(g.subtitle as string)
                if (g.category) setCategory(g.category as string)
                const c = (g.content || {}) as ArticleContent
                if (c.catchcopy) setCatchcopy(c.catchcopy)
                if (c.vignettes) setVignettes(padArray(c.vignettes, 5))
                if (c.problemParagraphs) setProblemParagraphs(padArray(c.problemParagraphs, 2))
                if (c.goalParagraphs) setGoalParagraphs(padArray(c.goalParagraphs, 2))
                if (c.techs) setTechs(padTechs(c.techs))
                if (c.challengeParagraphs) setChallengeParagraphs(padArray(c.challengeParagraphs, 2))
                if (c.sfIntro) setSfIntro(c.sfIntro)
                if (c.sfReferences) setSfRefs(padSfRefs(c.sfReferences))
                if (c.sfConnection) setSfConnection(c.sfConnection)
                if (c.closingQuestion) setClosingQuestion(c.closingQuestion)
                if (c.sources) setSources(c.sources)
                setSuccess('✨ AIが全フィールドを生成しました。確認・編集してから保存してください。')
            }

            setStepOutput(json.data.output)
            if (pipelineStep !== 'full_article') {
                setSuccess(`✅ ${STEPS.find(s => s.id === pipelineStep)?.label}完了。出力を確認してください。`)
            }
        } catch (e) { setError(e instanceof Error ? e.message : '生成エラー') }
        finally { setGenerating(false) }
    }

    useEffect(() => {
        const key = new URLSearchParams(window.location.search).get('key')
        if (key) { setOpsKey(key); void fetchData(key) }
    }, [fetchData])

    function handleLogin() { if (opsKey.trim()) void fetchData(opsKey.trim()) }

    // ---- Helpers ----
    function padArray(arr: string[] | undefined, len: number) {
        const a = arr || []
        return [...a, ...Array(Math.max(0, len - a.length)).fill('')]
    }
    function padTechs(arr?: { name: string; oneliner: string; bodyParagraphs: string[] }[]) {
        const a = (arr || []).map(t => ({ ...t, bodyParagraphs: padArray(t.bodyParagraphs, 2) }))
        while (a.length < 3) a.push({ ...EMPTY_TECH, bodyParagraphs: ['', ''] })
        return a
    }
    function padSfRefs(arr?: { title: string; author: string; body: string }[]) {
        const a = arr ? [...arr] : []
        while (a.length < 2) a.push({ ...EMPTY_SF })
        return a
    }
    function updateVignette(i: number, v: string) { setVignettes(prev => { const n = [...prev]; n[i] = v; return n }) }
    function updateTech(i: number, field: string, v: string) {
        setTechs(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: v }; return n })
    }
    function updateTechBody(ti: number, pi: number, v: string) {
        setTechs(prev => { const n = [...prev]; const bp = [...n[ti].bodyParagraphs]; bp[pi] = v; n[ti] = { ...n[ti], bodyParagraphs: bp }; return n })
    }
    function updateSfRef(i: number, field: string, v: string) {
        setSfRefs(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: v }; return n })
    }
    function updateImage(key: string, field: string, v: string) {
        setImages(prev => ({ ...prev, [key]: { ...prev[key], [field]: v } }))
    }
    function updateParagraph(setter: React.Dispatch<React.SetStateAction<string[]>>, i: number, v: string) {
        setter(prev => { const n = [...prev]; n[i] = v; return n })
    }

    // Drag & drop image handler
    function handleImageDrop(key: string) {
        return (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            e.currentTarget.classList.remove('ops-drop-active')
            const file = e.dataTransfer.files[0]
            if (!file || !file.type.startsWith('image/')) return
            const reader = new FileReader()
            reader.onload = () => {
                updateImage(key, 'url', reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }
    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        e.currentTarget.classList.add('ops-drop-active')
    }
    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.currentTarget.classList.remove('ops-drop-active')
    }

    const inputCls = 'ops-input'
    const labelCls = 'ops-label'
    const sectionCls = 'ops-section'

    // Login screen
    if (!authenticated) {
        return (
            <main className="ops-page flex items-center justify-center">
                <div className="ops-login-card w-full max-w-md">
                    <h1 className="ops-page-title text-xl mb-6">📝 記事エディタ</h1>
                    {error && <p className="ops-alert-error mb-3">{error}</p>}
                    <input type="password" value={opsKey} onChange={(e) => setOpsKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className={`${inputCls} mb-3`} placeholder="運用キー (OPS_SECRET)" />
                    <button onClick={handleLogin} className="ops-login-btn">ログイン</button>
                </div>
            </main>
        )
    }

    return (
        <main className="ops-page mx-auto max-w-4xl p-4 md:p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="ops-page-title">📝 記事エディタ</h1>
                <a href={`/ops?key=${encodeURIComponent(opsKey)}`} className="ops-link">← 運用管理に戻る</a>
            </div>

            {error && <div className="ops-alert-error mb-4">{error}</div>}
            {success && <div className="ops-alert-success mb-4">{success}</div>}

            <div className="space-y-6">

                {/* ===== AI PIPELINE ===== */}
                <section className="ops-section ops-section-ai">
                    <h2 className="ops-heading">🤖 AI パイプライン</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        各ステップを個別に実行できます。「✨ 一括生成」はテーマを選ぶだけでDB情報を自動取得し全フィールドをAI生成します。
                    </p>

                    {/* Provider + Model */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <div className="ops-toggle-group">
                            <button type="button" onClick={() => { setProvider('openai'); setModelOverride('') }}
                                className={`ops-toggle-btn ${provider === 'openai' ? 'active-openai' : ''}`}>
                                OpenAI
                            </button>
                            <button type="button" onClick={() => { setProvider('gemini'); setModelOverride('') }}
                                className={`ops-toggle-btn ${provider === 'gemini' ? 'active-gemini' : ''}`}>
                                Gemini
                            </button>
                        </div>
                        <input value={modelOverride}
                            onChange={(e) => setModelOverride(e.target.value)}
                            placeholder={provider === 'openai' ? 'gpt-4.1-mini' : 'gemini-2.5-flash'}
                            className="ops-input font-mono" style={{ width: '10rem' }} />
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {modelOverride.trim() || (provider === 'openai' ? 'gpt-4.1-mini' : 'gemini-2.5-flash')}
                        </span>
                    </div>

                    {/* Step selector */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {STEPS.map((s) => (
                            <button key={s.id} type="button" onClick={() => { setPipelineStep(s.id); setShowPrompt(false); setPromptEdited(false) }}
                                className={`ops-step-pill ${pipelineStep === s.id ? 'active' : ''}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {STEPS.find(s => s.id === pipelineStep)?.desc}
                        <span className="ml-2" style={{ color: 'rgba(255,255,255,0.2)' }}>(プロンプト: {STEPS.find(s => s.id === pipelineStep)?.prompt})</span>
                    </p>

                    {/* Input */}
                    <label className={labelCls}>入力テキスト</label>
                    <textarea value={preprocessedInput} onChange={(e) => setPreprocessedInput(e.target.value)}
                        rows={8} placeholder="背景情報や前のステップの出力を貼り付けてください"
                        className={`${inputCls} font-mono mb-3`} />

                    {/* Prompt preview/edit */}
                    <div className="mb-3">
                        <button type="button" onClick={async () => {
                            if (showPrompt) { setShowPrompt(false); return }
                            try {
                                const res = await fetch(`/api/ops/generate?key=${encodeURIComponent(opsKey)}&step=${pipelineStep}`)
                                const json = await res.json()
                                if (json.success) { setPromptText(json.data.template); setPromptEdited(false) }
                            } catch { /* ignore */ }
                            setShowPrompt(true)
                        }}
                            className="text-xs hover:underline mb-1" style={{ color: 'rgba(196,181,253,0.7)' }}>
                            {showPrompt ? '▲ プロンプトを隠す' : '📄 プロンプトを表示・編集'}
                        </button>
                        {showPrompt && (
                            <div>
                                <textarea value={promptText} onChange={(e) => { setPromptText(e.target.value); setPromptEdited(true) }}
                                    rows={12} className={`${inputCls} font-mono text-xs ${promptEdited ? 'ops-input-edited' : ''}`} />
                                {promptEdited && (
                                    <p className="mt-1 text-xs text-orange-600">
                                        ⚠ プロンプトが編集されています。実行時に編集後のプロンプトが使われます。
                                        <button type="button" onClick={() => { setPromptEdited(false); setShowPrompt(false) }}
                                            className="ml-2 underline">リセット</button>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 items-center flex-wrap">
                        <button onClick={() => pipelineStep === 'full_article' && themeId ? void runAutoGenerate() : void runStep()}
                            disabled={generating || (pipelineStep === 'full_article' ? !themeId : !preprocessedInput.trim())}
                            className={`${generating ? 'ops-shimmer' : ''} ${pipelineStep === 'full_article' ? 'bg-gradient-to-r from-purple-500 to-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all' : provider === 'gemini' ? 'ops-btn-primary ops-btn-gemini' : 'ops-btn-primary'}`}
                        >{generating ? '✨ 生成中…' : pipelineStep === 'full_article'
                            ? `✨ 一括生成 実行 (${provider === 'gemini' ? 'Gemini' : 'GPT'})${themeId ? '' : '— テーマ未選択'}`
                            : `▶ ${STEPS.find(s => s.id === pipelineStep)?.label} 実行 (${provider === 'gemini' ? 'Gemini' : 'GPT'})`
                            }</button>
                        {stepOutput && (
                            <button onClick={() => { setPreprocessedInput(stepOutput); setStepOutput('') }}
                                className="ops-btn-secondary">
                                ⬇ 出力→入力にコピー（次のステップ用）
                            </button>
                        )}
                    </div>

                    {/* Output */}
                    {stepOutput && (
                        <div className="mt-3">
                            <label className={labelCls}>出力結果</label>
                            <textarea value={stepOutput} onChange={(e) => setStepOutput(e.target.value)}
                                rows={12} className={`${inputCls} font-mono text-xs bg-white`} />
                        </div>
                    )}
                </section>

                {/* ===== HEADER ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">📋 基本情報</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <label className={labelCls}>テーマ (紐付け先) *</label>
                            <select value={themeId} onChange={(e) => {
                                const id = e.target.value
                                setThemeId(id)
                                void loadArticle(id)
                                // カテゴリを自動抽出
                                const theme = themes.find(t => t.id === id)
                                if (theme) {
                                    const match = theme.title.match(/^(ムーンショット目標\d+)/)
                                    if (match) setCategory(match[1])
                                }
                            }}
                                className={inputCls}>
                                <option value="">選択してください</option>
                                {themes.map(t => <option key={t.id} value={t.id}>{t.title} ({t._count.questions}問)</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>カテゴリ *</label>
                            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例: ムーンショット目標1" className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>記事タイトル *</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="20〜30字" className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>サブタイトル</label>
                            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="40〜60字で要約" className={inputCls} />
                        </div>
                    </div>
                </section>

                {/* ===== HERO IMAGE ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">📷 IMAGE-A: ヒーローイメージ</h2>
                    <div onDrop={handleImageDrop('hero')} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                        className="ops-dropzone mb-3">
                        {images.hero?.url ? (
                            <img src={images.hero.url} alt={images.hero.alt || ''} className="ops-preview-img" />
                        ) : (
                            <p className="ops-dropzone-text">🖼 画像をドラッグ＆ドロップ または URLを入力</p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <input value={images.hero?.url || ''} onChange={(e) => updateImage('hero', 'url', e.target.value)} placeholder="画像URL" className={inputCls} />
                        <input value={images.hero?.alt || ''} onChange={(e) => updateImage('hero', 'alt', e.target.value)} placeholder="代替テキスト" className={inputCls} />
                        <input value={images.hero?.caption || ''} onChange={(e) => updateImage('hero', 'caption', e.target.value)} placeholder="キャプション" className={inputCls} />
                    </div>
                </section>

                {/* ===== VIGNETTE ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ つかみ（ヴィネット）</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>キャッチコピー + 5人の断片（各８０〜１００字、計５００字）</p>
                    <label className={labelCls}>キャッチコピー</label>
                    <input value={catchcopy} onChange={(e) => setCatchcopy(e.target.value)} placeholder="20〜30字" className={`${inputCls} mb-3`} />
                    {vignettes.map((v, i) => (
                        <div key={i} className="mb-2">
                            <label className={labelCls}>ヴィネット {i + 1}</label>
                            <textarea value={v} onChange={(e) => updateVignette(i, e.target.value)} rows={2} placeholder={`人物${i + 1}の断片（80〜100字）`} className={inputCls} />
                        </div>
                    ))}
                </section>

                {/* ===== PROBLEM ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ 困りごとの背景</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>現実の問題を事実として伝える（計300字）</p>
                    {problemParagraphs.map((p, i) => (
                        <div key={i} className="mb-2">
                            <textarea value={p} onChange={(e) => updateParagraph(setProblemParagraphs, i, e.target.value)} rows={3} placeholder={`段落 ${i + 1}`} className={inputCls} />
                        </div>
                    ))}
                </section>

                {/* ===== TRANSITION IMAGE ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">📷 IMAGE-B: 転換イメージ</h2>
                    <div onDrop={handleImageDrop('transition')} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                        className="ops-dropzone mb-3">
                        {images.transition?.url ? (
                            <img src={images.transition.url} alt={images.transition.alt || ''} className="ops-preview-img" />
                        ) : (
                            <p className="ops-dropzone-text">🖼 画像をドラッグ＆ドロップ</p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <input value={images.transition?.url || ''} onChange={(e) => updateImage('transition', 'url', e.target.value)} placeholder="画像URL" className={inputCls} />
                        <input value={images.transition?.alt || ''} onChange={(e) => updateImage('transition', 'alt', e.target.value)} placeholder="代替テキスト" className={inputCls} />
                        <input value={images.transition?.caption || ''} onChange={(e) => updateImage('transition', 'caption', e.target.value)} placeholder="キャプション" className={inputCls} />
                    </div>
                </section>

                {/* ===== GOAL ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ この計画が目指すこと</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>目標を具体的に（計300字）</p>
                    {goalParagraphs.map((p, i) => (
                        <div key={i} className="mb-2">
                            <textarea value={p} onChange={(e) => updateParagraph(setGoalParagraphs, i, e.target.value)} rows={3} placeholder={`段落 ${i + 1}`} className={inputCls} />
                        </div>
                    ))}
                </section>

                {/* ===== TECHS ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ 技術説明（×3）</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>計500字</p>
                    {techs.map((t, ti) => (
                        <div key={ti} className="ops-nested-card">
                            <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>技術 {ti + 1}</p>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 mb-2">
                                <input value={t.name} onChange={(e) => updateTech(ti, 'name', e.target.value)} placeholder="技術名" className={inputCls} />
                                <input value={t.oneliner} onChange={(e) => updateTech(ti, 'oneliner', e.target.value)} placeholder="一言説明（30字）" className={inputCls} />
                            </div>
                            {t.bodyParagraphs.map((bp, pi) => (
                                <textarea key={pi} value={bp} onChange={(e) => updateTechBody(ti, pi, e.target.value)} rows={2}
                                    placeholder={`本文 段落${pi + 1}`} className={`${inputCls} mb-1`} />
                            ))}
                            {/* Tech image */}
                            <div onDrop={handleImageDrop(`tech${ti + 1}`)} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                                className="ops-dropzone-sm mt-2">
                                {images[`tech${ti + 1}`]?.url ? (
                                    <img src={images[`tech${ti + 1}`].url} alt={images[`tech${ti + 1}`].alt || ''} className="ops-preview-img-sm" />
                                ) : (
                                    <p className="ops-dropzone-text text-xs">🖼 技術{ti + 1}の画像をD＆D</p>
                                )}
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-2">
                                <input value={images[`tech${ti + 1}`]?.url || ''} onChange={(e) => updateImage(`tech${ti + 1}`, 'url', e.target.value)} placeholder="画像URL" className={`${inputCls} text-xs`} />
                                <input value={images[`tech${ti + 1}`]?.alt || ''} onChange={(e) => updateImage(`tech${ti + 1}`, 'alt', e.target.value)} placeholder="Alt" className={`${inputCls} text-xs`} />
                                <input value={images[`tech${ti + 1}`]?.caption || ''} onChange={(e) => updateImage(`tech${ti + 1}`, 'caption', e.target.value)} placeholder="Caption" className={`${inputCls} text-xs`} />
                            </div>
                        </div>
                    ))}
                </section>

                {/* ===== CHALLENGES ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ 今はまだ難しいこと</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>計300字</p>
                    {challengeParagraphs.map((p, i) => (
                        <div key={i} className="mb-2">
                            <textarea value={p} onChange={(e) => updateParagraph(setChallengeParagraphs, i, e.target.value)} rows={3} placeholder={`段落 ${i + 1}`} className={inputCls} />
                        </div>
                    ))}
                </section>

                {/* ===== SF REFERENCES ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ SFが先に描いていた</h2>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>引用ブロック ×1〜2</p>
                    <label className={labelCls}>SF導入文</label>
                    <input value={sfIntro} onChange={(e) => setSfIntro(e.target.value)} placeholder="30字" className={`${inputCls} mb-3`} />
                    {sfRefs.map((sf, i) => (
                        <div key={i} className="ops-nested-card">
                            <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>SF引用 {i + 1}</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <input value={sf.title} onChange={(e) => updateSfRef(i, 'title', e.target.value)} placeholder="作品名" className={inputCls} />
                                <input value={sf.author} onChange={(e) => updateSfRef(i, 'author', e.target.value)} placeholder="著者" className={inputCls} />
                            </div>
                            <textarea value={sf.body} onChange={(e) => updateSfRef(i, 'body', e.target.value)} rows={2} placeholder="本文（80字）" className={inputCls} />
                        </div>
                    ))}
                    <label className={labelCls}>計画との接続</label>
                    <input value={sfConnection} onChange={(e) => setSfConnection(e.target.value)} placeholder="40字" className={inputCls} />
                </section>

                {/* ===== CLOSING IMAGE ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">📷 IMAGE-F: 結びのイメージ</h2>
                    <div onDrop={handleImageDrop('closing')} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                        className="ops-dropzone mb-3">
                        {images.closing?.url ? (
                            <img src={images.closing.url} alt={images.closing.alt || ''} className="ops-preview-img" />
                        ) : (
                            <p className="ops-dropzone-text">🖼 画像をドラッグ＆ドロップ</p>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <input value={images.closing?.url || ''} onChange={(e) => updateImage('closing', 'url', e.target.value)} placeholder="画像URL" className={inputCls} />
                        <input value={images.closing?.alt || ''} onChange={(e) => updateImage('closing', 'alt', e.target.value)} placeholder="代替テキスト" className={inputCls} />
                        <input value={images.closing?.caption || ''} onChange={(e) => updateImage('closing', 'caption', e.target.value)} placeholder="キャプション" className={inputCls} />
                    </div>
                </section>

                {/* ===== CLOSING + SOURCES ===== */}
                <section className={sectionCls}>
                    <h2 className="ops-heading">■ 結び</h2>
                    <label className={labelCls}>問いかけ（60〜100字）</label>
                    <textarea value={closingQuestion} onChange={(e) => setClosingQuestion(e.target.value)} rows={2} placeholder="読者への問いかけ" className={`${inputCls} mb-4`} />
                    <label className={labelCls}>出典</label>
                    <textarea value={sources} onChange={(e) => setSources(e.target.value)} rows={3} placeholder="出典情報" className={inputCls} />
                </section>

                {/* ===== SAVE ===== */}
                <div className="ops-save-bar">
                    <select value={status} onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                        className="ops-input" style={{ width: 'auto' }}>
                        <option value="DRAFT">下書き</option>
                        <option value="PUBLISHED">公開</option>
                    </select>
                    <button onClick={() => void save()} disabled={saving || !themeId || !title.trim() || !category.trim()}
                        className="ops-btn-save">
                        {saving ? '保存中...' : '💾 記事を保存'}
                    </button>
                </div>
            </div>
        </main>
    )
}
