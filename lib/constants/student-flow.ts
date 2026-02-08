import type { StepDef } from '@/components/common/StepIndicator'

export const STUDENT_FLOW_ORDER = [
  'big-five',
  'big-five-result',
  'themes',
  'briefing',
  'questions',
  'visualization',
] as const

export type StudentFlowKey = (typeof STUDENT_FLOW_ORDER)[number]

export function buildStudentSteps(sessionId: string): StepDef[] {
  return [
    { key: 'big-five', label: 'タイプ診断', path: `/student/session/${sessionId}/big-five` },
    { key: 'big-five-result', label: '診断結果', path: `/student/session/${sessionId}/big-five/result` },
    { key: 'themes', label: 'テーマ選択', path: `/student/session/${sessionId}/themes` },
    { key: 'briefing', label: '読み物', path: `/student/session/${sessionId}/briefing` },
    { key: 'questions', label: '質問回答', path: `/student/session/${sessionId}/questions` },
    { key: 'visualization', label: '意見マップ', path: `/student/session/${sessionId}/visualization` },
  ]
}

export function completedStepKeys(currentKey: StudentFlowKey): string[] {
  const index = STUDENT_FLOW_ORDER.indexOf(currentKey)
  return STUDENT_FLOW_ORDER.slice(0, Math.max(index, 0))
}
