export const SESSION_STATUS_LABELS = {
  PREPARING: '準備中',
  ACTIVE: '進行中',
  COMPLETED: '完了',
  ARCHIVED: 'アーカイブ',
} as const

export function getSessionStatusLabel(status: string) {
  return SESSION_STATUS_LABELS[status as keyof typeof SESSION_STATUS_LABELS] || status
}
