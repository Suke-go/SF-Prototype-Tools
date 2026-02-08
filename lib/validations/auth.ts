import { z } from 'zod'

export const teacherRegisterSchema = z.object({
  schoolCode: z
    .string()
    .trim()
    .min(3, '学校コードは3文字以上で入力してください')
    .max(64, '学校コードは64文字以内で入力してください')
    .regex(/^[a-zA-Z0-9_-]+$/, '学校コードは英数字・ハイフン・アンダースコアのみ使用できます'),
  schoolName: z.string().trim().min(2, '学校名は2文字以上で入力してください').max(255, '学校名が長すぎます'),
  teacherName: z.string().trim().min(1, '教員名は必須です').max(255, '教員名が長すぎます'),
  email: z.string().trim().email('メールアドレス形式が不正です'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードは128文字以内で入力してください'),
})

export const teacherLoginSchema = z.object({
  email: z.string().trim().email('メールアドレス形式が不正です'),
  password: z.string().min(1, 'パスワードは必須です'),
})
