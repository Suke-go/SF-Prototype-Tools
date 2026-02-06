# Neon セットアップ（開発/配布向け）

## 1. NeonでDBを作る

- Neonでプロジェクト作成
- Database / Branch はデフォルトでOK

## 2. `DATABASE_URL` を取得

Neonのダッシュボードから接続文字列（Prisma用）を取得し、`.env` の `DATABASE_URL` に貼り付けます。

例（形だけ）:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

## 3. Prismaを反映

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 4. 動作確認

- `http://localhost:3000/admin/session/new` でテーマが出てセッション作成できる
- `http://localhost:3000/student` → セッションID入力 → Big Five → 結果保存まで進む

