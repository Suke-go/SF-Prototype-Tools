import { z } from 'zod'

const sessionCodeSchema = z
  .string()
  .trim()
  .min(4, 'セッションコードは4文字以上で入力してください')
  .max(32, 'セッションコードは32文字以内で入力してください')
  .regex(/^[A-Za-z0-9_-]+$/, 'セッションコードは英数字・ハイフン・アンダースコアのみ使用できます')

const themeIdSchema = z.string().uuid('テーマIDの形式が不正です')

export const createSessionSchema = z
  .object({
    title: z.string().trim().max(100, 'タイトルは100文字以内で入力してください').optional(),
    description: z.string().trim().max(500, '説明は500文字以内で入力してください').optional(),
    sessionCode: sessionCodeSchema,
    themeId: themeIdSchema.optional(),
    themeIds: z.array(themeIdSchema).max(20, 'テーマは20件まで選択できます').optional(),
    maxParticipants: z
      .number()
      .int()
      .min(1, '最大参加人数は1以上で入力してください')
      .max(200, '最大参加人数は200以下で入力してください')
      .default(50),
    passcode: z
      .string()
      .trim()
      .min(4, '参加コードは4文字以上で入力してください')
      .max(128, '参加コードは128文字以内で入力してください'),
  })
  .superRefine((value, ctx) => {
    if ((!value.themeIds || value.themeIds.length === 0) && !value.themeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['themeIds'],
        message: 'テーマを1つ以上選択してください',
      })
    }
  })
  .transform((value) => {
    const base = value.themeIds && value.themeIds.length > 0 ? value.themeIds : value.themeId ? [value.themeId] : []
    return {
      ...value,
      themeIds: Array.from(new Set(base)),
    }
  })

export const updateSessionSchema = z.object({
  status: z.enum(['PREPARING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  maxParticipants: z.number().int().min(1).max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const loginSchema = z
  .object({
    sessionId: z.string().uuid('sessionIdの形式が不正です').optional(),
    sessionCode: sessionCodeSchema.optional(),
    passcode: z.string().trim().min(4, '参加コードは4文字以上で入力してください').max(128, '参加コードは128文字以内で入力してください'),
  })
  .refine((value) => Boolean(value.sessionId || value.sessionCode), {
    message: 'sessionId または sessionCode のどちらかを入力してください',
    path: ['sessionCode'],
  })

export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type LoginInput = z.infer<typeof loginSchema>
