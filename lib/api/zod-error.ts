import { ZodError } from 'zod'
import { NextResponse } from 'next/server'

/**
 * ZodError をクライアントに安全な形式に変換して返す。
 * 内部スキーマ構造やバリデーションルールの詳細は露出しない。
 */
export function zodErrorResponse(error: unknown, message = '入力値に誤りがあります') {
    if (!(error instanceof ZodError)) return null

    return NextResponse.json(
        {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message,
                details: error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            },
        },
        { status: 400 }
    )
}
