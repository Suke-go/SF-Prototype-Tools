import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '利用規約 | SFプロトタイピング',
    description: 'SFプロトタイピング学習プラットフォームの利用規約',
}

export default function TermsPage() {
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

                <h1 className="font-heading text-3xl font-bold text-student-text-primary">利用規約</h1>
                <p className="mt-2 text-xs text-student-text-disabled">最終更新日: 2026年2月8日</p>

                <div className="mt-10 space-y-10 text-sm leading-relaxed text-student-text-secondary">
                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第1条（適用）
                        </h2>
                        <p>
                            本規約は、SFプロトタイピング学習プラットフォーム（以下「本サービス」）の利用に関する条件を定めるものです。本サービスを利用するすべてのユーザー（教員および生徒）に適用されます。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第2条（サービスの目的）
                        </h2>
                        <p>
                            本サービスは、学校教育における未来社会探究学習を支援することを目的としています。教員がセッションを作成し、生徒が設問への回答や性格特性診断を通じて多様な価値観に触れる学習体験を提供します。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第3条（アカウントと認証）
                        </h2>
                        <ul className="ml-4 list-disc space-y-2 marker:text-student-text-disabled">
                            <li>
                                教員は、メールアドレスとパスワードを用いてアカウントを登録します。登録情報は正確かつ最新のものを維持してください。
                            </li>
                            <li>
                                生徒は、教員が発行したセッションコードと参加コードを使用してセッションに参加します。生徒にアカウント登録は必要ありません。
                            </li>
                            <li>
                                認証情報の管理は各ユーザーの責任とし、第三者への貸与・譲渡を禁止します。
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第4条（禁止事項）
                        </h2>
                        <ul className="ml-4 list-disc space-y-2 marker:text-student-text-disabled">
                            <li>本サービスの不正利用またはセキュリティ機能の回避</li>
                            <li>他のユーザーの学習活動への妨害</li>
                            <li>虚偽の情報による教員アカウントの登録</li>
                            <li>サービスに対する過度な負荷をかける行為</li>
                            <li>法令または公序良俗に違反する内容の入力</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第5条（知的財産権）
                        </h2>
                        <p>
                            本サービスを構成するプログラム、デザイン、コンテンツ（テーマ・設問を含む）の知的財産権は、サービス提供者に帰属します。ユーザーが入力した回答やリフレクションの著作権は、当該ユーザーに帰属します。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第6条（免責事項）
                        </h2>
                        <ul className="ml-4 list-disc space-y-2 marker:text-student-text-disabled">
                            <li>
                                本サービスは「現状のまま」で提供され、特定目的への適合性を保証しません。
                            </li>
                            <li>
                                本サービスの利用に起因するいかなる損害についても、サービス提供者は故意または重過失がある場合を除き責任を負いません。
                            </li>
                            <li>
                                メンテナンスや障害によりサービスが一時的に利用できない場合があります。
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第7条（サービスの変更・終了）
                        </h2>
                        <p>
                            サービス提供者は、事前の通知なく本サービスの内容を変更、または提供を終了することがあります。サービス終了時は、教員にデータエクスポートのための猶予期間を設けます。
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 font-heading text-lg font-semibold text-student-text-primary">
                            第8条（準拠法）
                        </h2>
                        <p>本規約は日本法を準拠法とし、日本の裁判所を専属的合意管轄とします。</p>
                    </section>
                </div>
            </article>
        </main>
    )
}
