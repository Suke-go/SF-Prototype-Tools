export type SurveyPhase = 'PRE' | 'POST'
export type LikertValue = 1 | 2 | 3 | 4 | 5

export type SurveyLikertQuestion = {
  id: string
  text: string
}

export type SurveyTextQuestion = {
  id: string
  text: string
  placeholder: string
}

export type SurveyStoredAnswers = {
  likert: Record<string, LikertValue>
  freeText?: Record<string, string>
}

export const SURVEY_VERSION = '2026-ed-literacy-v1'

export const LIKERT_SCALE: Array<{ value: LikertValue; label: string }> = [
  { value: 1, label: 'ぜんぜんそう思わない' },
  { value: 2, label: 'あまりそう思わない' },
  { value: 3, label: 'どちらともいえない' },
  { value: 4, label: '少しそう思う' },
  { value: 5, label: 'とてもそう思う' },
]

export const COMMON_SURVEY_QUESTIONS: SurveyLikertQuestion[] = [
  { id: 'multi_view', text: '1つの問題を、いろいろな立場から考えられる。' },
  { id: 'merit_risk', text: '新しい技術の「よい点」と「心配な点」を両方考えられる。' },
  { id: 'reasoning', text: '自分の意見の理由を、ことばで説明できる。' },
  { id: 'other_view', text: '自分とちがう意見の人が、なぜそう考えるか想像できる。' },
  { id: 'unknown_state', text: '「まだわからないこと」を整理して言える。' },
  { id: 'fairness', text: 'だれが得をして、だれが困るかを考えられる。' },
  { id: 'time_horizon', text: '今だけでなく、少し先の影響まで考えられる。' },
  { id: 'compare_options', text: 'いくつかの案を比べて、選ぶ理由を説明できる。' },
]

export const POST_ONLY_SURVEY_QUESTIONS: SurveyLikertQuestion[] = [
  { id: 'new_point_found', text: 'この授業で、今まで気づかなかった見方に気づいた。' },
  { id: 'literacy_growth', text: '授業のあと、社会や技術の話題を前より深く考えられそうだ。' },
  { id: 'transfer_intent', text: 'この授業で学んだ考え方を、他の場面でも使えそうだ。' },
]

export const POST_TEXT_QUESTIONS: SurveyTextQuestion[] = [
  {
    id: 'new_point_detail',
    text: '今日、初めて気づいたことを1つ書いてください。',
    placeholder: '例: 便利さだけでなく公平さも考える必要があると気づいた',
  },
  {
    id: 'changed_opinion',
    text: '授業の前と後で変わった考えを1つ書いてください。',
    placeholder: '例: 反対意見にも理由があると感じるようになった',
  },
  {
    id: 'still_difficult',
    text: 'まだむずかしいと感じることを1つ書いてください。',
    placeholder: '例: どこまで安全なら使ってよいかの線引きがむずかしい',
  },
]

export function getLikertQuestions(phase: SurveyPhase): SurveyLikertQuestion[] {
  if (phase === 'PRE') return COMMON_SURVEY_QUESTIONS
  return [...COMMON_SURVEY_QUESTIONS, ...POST_ONLY_SURVEY_QUESTIONS]
}

export function getLikertQuestionIds(phase: SurveyPhase): string[] {
  return getLikertQuestions(phase).map((question) => question.id)
}

export function isLikertValue(value: unknown): value is LikertValue {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

export function coerceLikertAnswers(raw: unknown, phase: SurveyPhase): Record<string, LikertValue> | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as Record<string, unknown>
  const ids = getLikertQuestionIds(phase)
  const result: Record<string, LikertValue> = {}

  for (const id of ids) {
    const value = input[id]
    if (!isLikertValue(value)) return null
    result[id] = value
  }
  return result
}

export function coercePostTextAnswers(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const input = raw as Record<string, unknown>
  const result: Record<string, string> = {}
  for (const question of POST_TEXT_QUESTIONS) {
    const value = input[question.id]
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed.length > 0) result[question.id] = trimmed
  }
  return result
}

export function safeSurveyAnswers(value: unknown): SurveyStoredAnswers | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!raw.likert || typeof raw.likert !== 'object') return null

  const likert: Record<string, LikertValue> = {}
  for (const [key, val] of Object.entries(raw.likert as Record<string, unknown>)) {
    if (!isLikertValue(val)) continue
    likert[key] = val
  }

  const freeText: Record<string, string> = {}
  if (raw.freeText && typeof raw.freeText === 'object') {
    for (const [key, val] of Object.entries(raw.freeText as Record<string, unknown>)) {
      if (typeof val !== 'string') continue
      const trimmed = val.trim()
      if (trimmed.length > 0) freeText[key] = trimmed
    }
  }

  return {
    likert,
    freeText: Object.keys(freeText).length > 0 ? freeText : undefined,
  }
}
