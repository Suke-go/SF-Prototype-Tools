import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'

function verifyOpsSecret(request: NextRequest): boolean {
    const secret = process.env.OPS_SECRET
    if (!secret) return false
    const provided =
        request.headers.get('x-ops-secret') ||
        new URL(request.url).searchParams.get('key')
    if (!provided || provided.length !== secret.length) return false
    let result = 0
    for (let i = 0; i < secret.length; i++) {
        result |= secret.charCodeAt(i) ^ provided.charCodeAt(i)
    }
    return result === 0
}

// プロンプトファイルの読み込み
function loadPrompt(filename: string): string | null {
    try {
        return readFileSync(join(process.cwd(), 'docs', 'prompts', filename), 'utf-8')
    } catch {
        return null
    }
}

// ---------- OpenAI ----------
async function callOpenAI(
    prompt: string,
    opts: { json?: boolean; maxTokens?: number; model?: string } = {}
): Promise<string> {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('OPENAI_API_KEY が未設定です')

    const body: Record<string, unknown> = {
        model: opts.model || process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: opts.maxTokens || 4000,
    }
    if (opts.json) body.response_format = { type: 'json_object' }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const errText = await res.text()
        console.error('OpenAI error:', errText.slice(0, 200))
        throw new Error(`OpenAI APIエラー (${res.status})`)
    }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI から空のレスポンス')
    return content
}

// ---------- Gemini ----------
async function callGemini(
    prompt: string,
    opts: { json?: boolean; maxTokens?: number; model?: string } = {}
): Promise<string> {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('GEMINI_API_KEY が未設定です')

    const model = opts.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

    const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: opts.maxTokens || 4000,
            ...(opts.json ? { responseMimeType: 'application/json' } : {}),
        },
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const errText = await res.text()
        console.error('Gemini error:', errText.slice(0, 200))
        throw new Error(`Gemini APIエラー (${res.status})`)
    }
    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) throw new Error('Gemini から空のレスポンス')
    return content
}

// ---------- ステップ定義 ----------
const STEP_CONFIG: Record<string, { file: string; json: boolean; maxTokens: number }> = {
    intro_sf: { file: 'intro-sf-writer.md', json: false, maxTokens: 4000 },
    meidai: { file: 'meidai.md', json: true, maxTokens: 6000 },
    meidai_review: { file: 'meidai_review.md', json: false, maxTokens: 4000 },
    article_gen: { file: 'article_gen.md', json: false, maxTokens: 6000 },
    editor: { file: 'editor.md', json: false, maxTokens: 6000 },
    full_article: { file: 'article_generator.md', json: true, maxTokens: 6000 },
}

// プレースホルダー一覧（すべて同じ input で置換）
const PLACEHOLDERS = [
    '{ここにムーンショット計画の本文テキストを貼る}',
    '{ここに研究目標の概要を入れる}',
    '{ここにテーマを入れる}',
    '{ここに質問リストを貼る}',
    '{ここに500字のSFヴィネットを貼る}',
    '{ここに前段プロンプトの出力を貼る}',
    '{ここに校正対象のテキストを入れる}',
    '{preprocessed_content}',
]

// ---------- POST ----------
export async function POST(request: NextRequest) {
    if (!verifyOpsSecret(request)) {
        return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: '運用キーが無効です' } },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { step, input, category, provider, customPrompt } = body as {
            step: string
            input: string
            category?: string
            provider?: 'openai' | 'gemini'   // デフォルト: openai
            customPrompt?: string             // UI でプロンプトを編集した場合
        }

        if (!step || !input?.trim()) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_INPUT', message: 'step と input は必須です' } },
                { status: 400 }
            )
        }

        // ステップの設定を取得
        const config = STEP_CONFIG[step]
        if (!config) {
            return NextResponse.json(
                { success: false, error: { code: 'INVALID_STEP', message: `不明なステップ: ${step}` } },
                { status: 400 }
            )
        }

        // プロンプト構築: customPrompt があればそれを使う（プロンプト編集機能）
        let fullPrompt: string
        if (customPrompt?.trim()) {
            fullPrompt = customPrompt
        } else {
            const promptTemplate = loadPrompt(config.file)
            if (!promptTemplate) {
                return NextResponse.json(
                    { success: false, error: { code: 'CONFIG_ERROR', message: `プロンプトファイルが見つかりません: ${config.file}` } },
                    { status: 500 }
                )
            }
            // プレースホルダー置換
            fullPrompt = promptTemplate
            for (const ph of PLACEHOLDERS) {
                fullPrompt = fullPrompt.replace(ph, input)
            }
            // カテゴリ置換（JSONインジェクション対策）
            if (category) {
                const safe = category.replace(/[\\"/\n\r\t]/g, '')
                fullPrompt = fullPrompt.replace('"category": "カテゴリ名"', `"category": "${safe}"`)
            }
        }

        // LLM 呼び出し
        const callOpts = { json: config.json, maxTokens: config.maxTokens }
        const selectedProvider = provider || 'openai'
        const raw = selectedProvider === 'gemini'
            ? await callGemini(fullPrompt, callOpts)
            : await callOpenAI(fullPrompt, callOpts)

        // JSON出力のパース試行
        let parsed: unknown = null
        if (config.json) {
            try { parsed = JSON.parse(raw) } catch {
                const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (match) {
                    try { parsed = JSON.parse(match[1]) } catch { /* ignore */ }
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                step,
                provider: selectedProvider,
                output: raw,
                parsed: parsed || undefined,
                promptUsed: fullPrompt,  // フロントでプロンプト確認用
            },
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || '入力が不正です' } },
                { status: 400 }
            )
        }
        console.error('Generate error:', error instanceof Error ? error.message : error)
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : '生成に失敗しました' } },
            { status: 500 }
        )
    }
}

// ---------- GET: プロンプトテンプレートを取得 ----------
export async function GET(request: NextRequest) {
    if (!verifyOpsSecret(request)) {
        return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: '運用キーが無効です' } },
            { status: 401 }
        )
    }

    const step = new URL(request.url).searchParams.get('step')
    if (!step || !STEP_CONFIG[step]) {
        return NextResponse.json(
            { success: false, error: { code: 'INVALID_STEP', message: 'step が必要です' } },
            { status: 400 }
        )
    }

    const template = loadPrompt(STEP_CONFIG[step].file)
    return NextResponse.json({
        success: true,
        data: {
            step,
            file: STEP_CONFIG[step].file,
            template: template || '',
        },
    })
}
