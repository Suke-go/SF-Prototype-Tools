import { z } from 'zod'

export const createSessionSchema = z.object({
  // セッション名はUI上は不要。必要なら後で入れられるよう任意で受ける。
  title: z.string().max(100, 'タイトルは100文字以内で入力してください').optional(),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional(),
  themeId: z.string().uuid('テーマIDが不正です'),
  maxParticipants: z.number().int().min(1, '最大参加者数は1以上です').max(200, '最大参加者数は200以下です').default(50),
  passcode: z.string().min(8, 'パスコードは8文字以上です').regex(/[A-Za-z0-9]/, 'パスコードは英数字を含む必要があります'),
})

export const updateSessionSchema = z.object({
  status: z.enum(['PREPARING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  maxParticipants: z.number().int().min(1).max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const loginSchema = z.object({
  sessionId: z.string().uuid('セッションIDが不正です'),
  passcode: z.string().min(1, 'パスコードは必須です'),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type LoginInput = z.infer<typeof loginSchema>
