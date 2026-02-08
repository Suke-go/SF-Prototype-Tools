import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'プライバシーポリシー | SFプロトタイピング',
    description: 'SFプロトタイピング学習プラットフォームのプライバシーポリシー',
}

export default function PrivacyPolicyPage() {
    return (
        <main className="matte-texture relative min-h-screen px-6 py-16">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-[120px]" />
            </div>

            <article className="relative z-10 mx-auto max-w-2xl">
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-student-text-tertiary transition-colors hover:text-student-text-secondary"
                >
                    ← トップに戻る
                </Link>

                <h1 className="font-heading text-3xl font-bold text-student-text-primary">
                    プライバシーポリシー
                </h1>
                <p className="mt-2 text-xs text-student-text-disabled">最終更新日: 2026年2月8日</p>

                <div className="mt-10 space-y-10 text-sm leading-relaxed text-student-text-secondary">
                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            1. はじめに
                        </h2>
                        <p>
                            SFプロトタイピング学習プラットフォーム（以下「本サービス」）は、学校教育における未来社会探究学習を支援するツールです。本ポリシーでは、本サービスが収集・利用する情報とその取り扱いについて説明します。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            2. 収集する情報
                        </h2>
                        <ul className="ml-4 list-disc space-y-2 marker:text-student-text-disabled">
                            <li>
                                <strong className="text-student-text-primary">教員情報:</strong>{' '}
                                氏名、メールアドレス、所属学校コード（アカウント登録時に提供）
                            </li>
                            <li>
                                <strong className="text-student-text-primary">生徒情報:</strong>{' '}
                                表示名（セッション参加時に入力）。メールアドレスや個人を特定する情報は収集しません。
                            </li>
                            <li>
                                <strong className="text-student-text-primary">学習活動データ:</strong>{' '}
                                設問への回答、性格特性診断（Big Five）の結果、学習リフレクション
                            </li>
                            <li>
                                <strong className="text-student-text-primary">技術情報:</strong>{' '}
                                IPアドレス（不正アクセス防止のため一時的に使用）、Cookie（認証のために使用）
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            3. 情報の利用目的
                        </h2>
                        <ul className="ml-4 list-disc space-y-2 marker:text-student-text-disabled">
                            <li>セッションの運営および学習体験の提供</li>
                            <li>クラス全体の回答傾向の可視化（個人の特定はしません）</li>
                            <li>教員による学習評価の補助</li>
                            <li>サービスの安定運用およびセキュリティの確保</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            4. 第三者への提供
                        </h2>
                        <p>
                            本サービスは、法令に基づく場合を除き、収集した情報を第三者に提供しません。可視化やデータエクスポートは、セッションを作成した教員のみがアクセスできます。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            5. データの保管と削除
                        </h2>
                        <p>
                            学習データはセッション終了後90日間保管し、その後自動的に削除します。教員はセッション終了前にデータをエクスポートすることが可能です。教員アカウントの削除を希望する場合は、サービス管理者にご連絡ください。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            6. Cookie の使用
                        </h2>
                        <p>
                            本サービスでは、認証情報の管理のためにCookieを使用します。使用するCookieはセッション維持のために必要な最小限のものであり、広告目的のトラッキングは一切行いません。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            7. セキュリティ
                        </h2>
                        <p>
                            本サービスは、通信の暗号化（HTTPS）、認証トークンの安全な管理、不正アクセスの検知・防御など、適切な技術的措置を講じて情報を保護します。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            8. お問い合わせ
                        </h2>
                        <p>
                            本ポリシーに関するご質問は、所属学校の担当教員またはサービス管理者までお問い合わせください。
                        </p>
                    </section>
                </div>
            </article>
        </main>
    )
}
