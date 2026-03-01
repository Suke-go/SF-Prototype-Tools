'use client'

import { useCallback, useEffect, useState } from 'react'
import './ops.css'

type InviteCode = { id: string; code: string; usedBy: string | null; expiresAt: string; createdAt: string }
type ThemeItem = { id: string; title: string; description: string | null; status: string; createdAt: string; _count: { questions: number } }
type SchoolItem = { id: string; code: string; name: string; status: string; _count: { teachers: number; sessions: number } }
type QuestionItem = { id: string; questionText: string; order: number }

export default function OpsPage() {
    const [opsKey, setOpsKey] = useState('')
    const [authenticated, setAuthenticated] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
    const [themes, setThemes] = useState<ThemeItem[]>([])
    const [schools, setSchools] = useState<SchoolItem[]>([])

    // Invite form
    const [inviteCount, setInviteCount] = useState(3)
    const [inviteDays, setInviteDays] = useState(90)

    // Theme form
    const [newThemeTitle, setNewThemeTitle] = useState('')
    const [newThemeDesc, setNewThemeDesc] = useState('')
    const [newThemeQuestions, setNewThemeQuestions] = useState('')

    // Theme detail / add questions
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null)
    const [selectedThemeTitle, setSelectedThemeTitle] = useState('')
    const [themeQuestions, setThemeQuestions] = useState<QuestionItem[]>([])
    const [addQuestionText, setAddQuestionText] = useState('')

    const fetchData = useCallback(async (key: string) => {
        setLoading(true); setError(null)
        try {
            const res = await fetch(`/api/ops?key=${encodeURIComponent(key)}`)
            if (res.status === 401) { setAuthenticated(false); setError('運用キーが無効です'); return }
            const json = await res.json()
            if (!json.success) throw new Error(json.error?.message || 'データ取得に失敗')
            setInviteCodes(json.data.inviteCodes)
            setThemes(json.data.themes)
            setSchools(json.data.schools)
            setAuthenticated(true)
        } catch (e) { setError(e instanceof Error ? e.message : '通信エラー') }
        finally { setLoading(false) }
    }, [])

    async function fetchThemeDetail(themeId: string) {
        try {
            const res = await fetch(`/api/ops?key=${encodeURIComponent(opsKey)}&themeId=${themeId}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.error?.message || '取得失敗')
            setSelectedThemeId(themeId)
            setSelectedThemeTitle(json.data.theme.title)
            setThemeQuestions(json.data.theme.questions)
        } catch (e) { setError(e instanceof Error ? e.message : '通信エラー') }
    }

    async function postAction(body: Record<string, unknown>) {
        setError(null); setSuccess(null)
        const res = await fetch('/api/ops', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-ops-secret': opsKey },
            body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error?.message || '操作に失敗')
        return json
    }

    async function generateInvites() {
        try {
            const json = await postAction({ action: 'generate_invites', count: inviteCount, expiresInDays: inviteDays })
            setSuccess(`招待コード ${json.data.codes.length} 件生成: ${json.data.codes.join(', ')}`)
            void fetchData(opsKey)
        } catch (e) { setError(e instanceof Error ? e.message : '通信エラー') }
    }

    async function createTheme() {
        if (!newThemeTitle.trim()) return
        try {
            const questions = newThemeQuestions.split('\n').map(s => s.trim()).filter(Boolean)
            const json = await postAction({
                action: 'create_theme',
                title: newThemeTitle.trim(),
                description: newThemeDesc.trim() || undefined,
                questions: questions.length > 0 ? questions : undefined,
            })
            setSuccess(`テーマ「${json.data.theme.title}」を作成（設問 ${json.data.questionCount} 件）`)
            setNewThemeTitle(''); setNewThemeDesc(''); setNewThemeQuestions('')
            void fetchData(opsKey)
        } catch (e) { setError(e instanceof Error ? e.message : '通信エラー') }
    }

    async function addQuestions() {
        if (!selectedThemeId || !addQuestionText.trim()) return
        try {
            const questions = addQuestionText.split('\n').map(s => s.trim()).filter(Boolean)
            if (questions.length === 0) return
            const json = await postAction({ action: 'add_questions', themeId: selectedThemeId, questions })
            setSuccess(`${json.data.addedCount} 件の設問を追加しました`)
            setAddQuestionText('')
            void fetchThemeDetail(selectedThemeId)
            void fetchData(opsKey)
        } catch (e) { setError(e instanceof Error ? e.message : '通信エラー') }
    }

    function handleLogin() { if (opsKey.trim()) void fetchData(opsKey.trim()) }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const key = params.get('key')
        if (key) { setOpsKey(key); void fetchData(key) }
    }, [fetchData])

    // ==================== Login Screen ====================
    if (!authenticated) {
        return (
            <main className="ops-page flex items-center justify-center">
                <div className="ops-login-card w-full max-w-md">
                    <h1 className="ops-page-title text-xl mb-4">🔧 運用管理</h1>
                    {error && <p className="ops-alert-error mb-3">{error}</p>}
                    <label className="ops-label">運用キー (OPS_SECRET)</label>
                    <input type="password" value={opsKey} onChange={(e) => setOpsKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="ops-input mb-3" placeholder="運用キーを入力" />
                    <button onClick={handleLogin} disabled={!opsKey.trim() || loading}
                        className="ops-login-btn">
                        {loading ? '認証中...' : 'ログイン'}
                    </button>
                </div>
            </main>
        )
    }

    // ==================== Dashboard ====================
    return (
        <main className="ops-page mx-auto max-w-6xl p-4 md:p-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="ops-page-title">🔧 運用管理</h1>
                <div className="flex items-center gap-4">
                    <a href={`/ops/article?key=${encodeURIComponent(opsKey)}`} className="ops-link">📝 記事エディタ</a>
                    <button onClick={() => { setAuthenticated(false); setOpsKey('') }} className="ops-link text-sm">ログアウト</button>
                </div>
            </div>

            {error && <div className="ops-alert-error mb-4">{error}</div>}
            {success && <div className="ops-alert-success mb-4">{success}</div>}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* ========== 招待コード ========== */}
                <section className="ops-section">
                    <h2 className="ops-heading">📨 招待コード</h2>
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">件数</label>
                            <input type="number" min={1} max={20} value={inviteCount} onChange={(e) => setInviteCount(Number(e.target.value))}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">有効日数</label>
                            <input type="number" min={1} max={365} value={inviteDays} onChange={(e) => setInviteDays(Number(e.target.value))}
                                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={() => void generateInvites()} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">生成</button>
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 border-b"><tr><th className="py-1 text-left">コード</th><th className="text-left">状態</th><th className="text-left">期限</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {inviteCodes.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="py-1.5 font-mono text-xs">{inv.code}</td>
                                        <td>{inv.usedBy ? <span className="text-xs text-gray-400">使用済</span> : new Date(inv.expiresAt) < new Date() ? <span className="text-xs text-red-500">期限切れ</span> : <span className="text-xs text-green-600 font-medium">有効</span>}</td>
                                        <td className="text-xs text-gray-500">{new Date(inv.expiresAt).toLocaleDateString('ja-JP')}</td>
                                    </tr>
                                ))}
                                {inviteCodes.length === 0 && <tr><td colSpan={3} className="py-3 text-center text-gray-400">招待コードがありません</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ========== テーマ作成 ========== */}
                <section className="ops-section">
                    <h2 className="ops-heading">📚 テーマ新規作成</h2>
                    <div className="space-y-2">
                        <input value={newThemeTitle} onChange={(e) => setNewThemeTitle(e.target.value)}
                            placeholder="テーマタイトル" className="ops-input" />
                        <textarea value={newThemeDesc} onChange={(e) => setNewThemeDesc(e.target.value)}
                            placeholder="説明（任意）" rows={2} className="ops-input" />
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">設問（1行1問、任意）</label>
                            <textarea value={newThemeQuestions} onChange={(e) => setNewThemeQuestions(e.target.value)}
                                placeholder={"技術の利用は制限すべきだ。\nプライバシーより安全を優先すべきだ。\n..."} rows={5}
                                className="ops-input font-mono" />
                        </div>
                        <button onClick={() => void createTheme()} disabled={!newThemeTitle.trim()}
                            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                            テーマ作成
                        </button>
                    </div>
                </section>

                {/* ========== テーマ一覧 + 詳細 ========== */}
                <section className="ops-section lg:col-span-2">
                    <h2 className="ops-heading">📋 テーマ・設問管理</h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* テーマ一覧 */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">テーマ一覧（クリックで設問表示）</h3>
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {themes.map((t) => (
                                    <button key={t.id} type="button" onClick={() => void fetchThemeDetail(t.id)}
                                        className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${selectedThemeId === t.id ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}`}>
                                        <span className="font-medium">{t.title}</span>
                                        <span className="ml-2 text-xs text-gray-500">({t._count.questions}問)</span>
                                        <span className={`ml-2 text-xs ${t.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`}>{t.status}</span>
                                    </button>
                                ))}
                                {themes.length === 0 && <p className="text-sm text-gray-400">テーマがありません</p>}
                            </div>
                        </div>

                        {/* 設問一覧 + 追加 */}
                        <div>
                            {selectedThemeId ? (
                                <>
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                                        {selectedThemeTitle} <span className="text-gray-400">({themeQuestions.length}問)</span>
                                    </h3>
                                    <div className="max-h-48 overflow-y-auto mb-3">
                                        <ol className="list-decimal list-inside space-y-0.5 text-sm text-gray-700">
                                            {themeQuestions.map((q) => (
                                                <li key={q.id} className="leading-relaxed">{q.questionText}</li>
                                            ))}
                                        </ol>
                                        {themeQuestions.length === 0 && <p className="text-sm text-gray-400">設問がありません</p>}
                                    </div>

                                    <label className="block text-xs text-gray-500 mb-1">設問を追加（1行1問）</label>
                                    <textarea value={addQuestionText} onChange={(e) => setAddQuestionText(e.target.value)}
                                        placeholder={"新しい設問を入力...\n1行に1問ずつ"} rows={3}
                                        className="ops-input font-mono mb-2" />
                                    <button onClick={() => void addQuestions()} disabled={!addQuestionText.trim()}
                                        className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                                        設問を追加
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                                    ← テーマを選択してください
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ========== 学校一覧 ========== */}
                <section className="ops-section lg:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">🏫 登録学校</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 border-b"><tr><th className="py-1 text-left">コード</th><th className="text-left">学校名</th><th className="text-left">教員数</th><th className="text-left">セッション数</th><th className="text-left">状態</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {schools.map((s) => (
                                    <tr key={s.id}>
                                        <td className="py-1.5 font-mono text-xs">{s.code}</td>
                                        <td>{s.name}</td>
                                        <td className="text-xs text-gray-500">{s._count.teachers}</td>
                                        <td className="text-xs text-gray-500">{s._count.sessions}</td>
                                        <td><span className={`text-xs font-medium ${s.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`}>{s.status}</span></td>
                                    </tr>
                                ))}
                                {schools.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-gray-400">学校が登録されていません</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    )
}
