import { z } from 'zod'

export const bigFiveAnswerSchema = z.object({
  questionNumber: z.number().int().min(1).max(10),
  score: z.number().int().min(0).max(4),
})

export const saveBigFiveSchema = z.object({
  sessionId: z.string().uuid('セッションIDが不正です'),
  studentId: z.string().uuid('学生IDが不正です'),
  answers: z.array(bigFiveAnswerSchema).length(10),
})

export type SaveBigFiveInput = z.infer<typeof saveBigFiveSchema>

