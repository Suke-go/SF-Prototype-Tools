# SFプロトタイピング教育プラットフォーム

教育用途における「自分探し×SFプロトタイピング×集団の意見の可視化」を実現するWebプラットフォーム。

## 技術スタック

- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **データベース**: PostgreSQL (Prisma ORM)
- **認証**: JWT

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require&connection_limit=5&pool_timeout=10"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2.5 DB（Neon推奨）

学校配布を見据える場合、**ローカルDBよりマネージドPostgres（Neon等）**が現実的です。

- NeonでDBを作成し、ダッシュボードから **接続文字列（DATABASE_URL）** を取得
- `.env` の `DATABASE_URL` を Neon の文字列に差し替え

注意:
- Neonは通常 `sslmode=require` が必要です
- 接続文字列は機密情報なので共有しないでください

### 3. データベースのセットアップ

```bash
# Prisma Clientの生成
npm run db:generate

# データベースマイグレーション
npm run db:migrate

# シードデータの投入（オプション）
npm run db:seed
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## プロジェクト構造

```
sf-prototyping-platform/
├── app/                    # Next.js App Router
│   ├── (admin)/           # 管理者向けルート
│   ├── (student)/         # 生徒向けルート
│   └── api/               # API Routes
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティ・ライブラリ
├── prisma/                # Prismaスキーマ
└── docs/                  # ドキュメント
```

## スクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - ESLintを実行
- `npm run type-check` - TypeScriptの型チェック
- `npm run db:generate` - Prisma Clientを生成
- `npm run db:migrate` - データベースマイグレーション
- `npm run db:studio` - Prisma Studioを起動

## ドキュメント

詳細な設計ドキュメントは `docs/` ディレクトリを参照してください。

- [要件定義書](./docs/requirement.md)
- [実行計画](./docs/execution_plan.md)
- [設計ドキュメント](./docs/design/)

## ライセンス

Private
