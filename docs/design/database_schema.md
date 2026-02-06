# データベース設計書

## 1. 概要

本システムはPostgreSQLデータベースを使用し、Prisma ORMでデータアクセスを管理する。一セッション対応（初期実装）だが、将来的にマルチセッション対応可能な設計とする。

---

## 2. ER図（概念モデル）

```
┌─────────────┐
│   School    │ (Future Work)
│─────────────│
│ id          │
│ name        │
│ description │
│ status      │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────┐      ┌─────────────┐
│   Session   │      │   Teacher   │
│─────────────│      │─────────────│
│ id          │◄─────│ id          │
│ title       │      │ name        │
│ description │      │ email       │
│ schoolId    │      │ schoolId    │
│ themeId     │──┐  └─────────────┘
│ status      │  │
│ maxParticipants│  │
│ createdAt   │  │
│ updatedAt   │  │
└──────┬──────┘  │
       │         │
       │ 1:N     │ N:1
       │         │
┌──────▼──────┐  │  ┌─────────────┐
│   Student   │  │  │   Theme     │
│─────────────│  │  │─────────────│
│ id          │  │  │ id          │
│ name        │  │  │ title       │
│ email       │  │  │ description │
│ schoolId    │  │  │ worldviewCardId│
│ sessionId   │──┘  │ status      │
│ bigFiveResultId│  └─────────────┘
│ progressStatus│
└──────┬──────┘
       │
       │ 1:1
       │
┌──────▼──────┐
│BigFiveResult│
│─────────────│
│ id          │
│ studentId   │
│ extraversion│
│ agreeableness│
│ conscientiousness│
│ neuroticism │
│ openness    │
│ completedAt │
└─────────────┘

┌─────────────┐      ┌─────────────┐
│   Question  │      │StudentResponse│
│─────────────│      │─────────────│
│ id          │◄─────│ id          │
│ themeId     │      │ studentId   │
│ questionText│      │ sessionId   │
│ order       │      │ questionId  │
│ questionType│      │ responseValue│
└─────────────┘      │ answeredAt  │
                     └─────────────┘

┌─────────────┐
│OpinionMapping│
│─────────────│
│ id          │
│ sessionId   │
│ mappingData │ (JSON)
│ clusterData │ (JSON)
│ conflictAreas│ (JSON)
│ consensusAreas│ (JSON)
│ generatedAt │
└─────────────┘
```

---

## 3. Prismaスキーマ

### 3.1 完全なスキーマ定義

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 学校（マルチテナント対応、Future Work）
// ============================================
model School {
  id          String    @id @default(uuid())
  name        String    @db.VarChar(255)
  description String?   @db.Text
  status      SchoolStatus @default(ACTIVE)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  sessions    Session[]
  students    Student[]
  teachers    Teacher[]

  @@index([status])
  @@map("schools")
}

enum SchoolStatus {
  ACTIVE
  INACTIVE
}

// ============================================
// セッション
// ============================================
model Session {
  id              String        @id @default(uuid())
  title           String        @db.VarChar(100)
  description     String?       @db.VarChar(500)
  schoolId        String        // Future Work: マルチテナント対応
  themeId         String
  status          SessionStatus @default(PREPARING)
  maxParticipants Int           @default(50)
  startDate       DateTime?
  endDate         DateTime?
  progressMode    ProgressMode  @default(UNIFORM)
  passcodeHash    String?       // 管理者用パスコード（bcryptハッシュ）
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  school          School?       @relation(fields: [schoolId], references: [id])
  theme           Theme         @relation(fields: [themeId], references: [id])
  students        Student[]
  responses       StudentResponse[]
  opinionMappings OpinionMapping[]

  @@index([schoolId])
  @@index([themeId])
  @@index([status])
  @@index([createdAt])
  @@map("sessions")
}

enum SessionStatus {
  PREPARING  // 準備中
  ACTIVE     // 進行中
  COMPLETED  // 完了
  ARCHIVED   // アーカイブ
}

enum ProgressMode {
  UNIFORM  // 一律進行（Mentimeter風）
}

// ============================================
// テーマ
// ============================================
model Theme {
  id              String        @id @default(uuid())
  title           String        @db.VarChar(255)
  description     String?       @db.Text
  worldviewCardId String?       // 世界観カードID（Future Work）
  status          ThemeStatus   @default(ACTIVE)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  sessions        Session[]
  questions       Question[]

  @@index([status])
  @@map("themes")
}

enum ThemeStatus {
  ACTIVE
  INACTIVE
}

// ============================================
// 質問
// ============================================
model Question {
  id           String       @id @default(uuid())
  themeId      String
  questionText String        @db.Text
  order        Int           // 表示順序（1-20）
  questionType QuestionType  @default(YES_NO_UNKNOWN)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  // Relations
  theme        Theme        @relation(fields: [themeId], references: [id])
  responses    StudentResponse[]

  @@unique([themeId, order])
  @@index([themeId])
  @@index([order])
  @@map("questions")
}

enum QuestionType {
  YES_NO_UNKNOWN  // はい/わからない/いいえの3択固定
}

// ============================================
// 教員
// ============================================
model Teacher {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(255)
  email     String?  @db.VarChar(255)
  schoolId  String   // Future Work: マルチテナント対応
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school    School?  @relation(fields: [schoolId], references: [id])

  @@unique([email])
  @@index([schoolId])
  @@map("teachers")
}

// ============================================
// 学生
// ============================================
model Student {
  id              String          @id @default(uuid())
  name            String?         @db.VarChar(255) // 匿名参加可能
  email           String?         @db.VarChar(255)
  schoolId        String          // Future Work: マルチテナント対応
  sessionId       String
  bigFiveResultId String?
  progressStatus  StudentProgressStatus @default(NOT_STARTED)
  joinedAt        DateTime        @default(now())
  lastAccessAt    DateTime        @updatedAt

  // Relations
  school          School?         @relation(fields: [schoolId], references: [id])
  session         Session        @relation(fields: [sessionId], references: [id])
  bigFiveResult   BigFiveResult? @relation(fields: [bigFiveResultId], references: [id])
  responses       StudentResponse[]
  groupActivities GroupActivity[]

  @@index([schoolId])
  @@index([sessionId])
  @@index([progressStatus])
  @@index([lastAccessAt])
  @@map("students")
}

enum StudentProgressStatus {
  NOT_STARTED      // 未開始
  BIG_FIVE         // Big Five診断中
  THEME_SELECTION  // テーマ選択中
  MAIN_PAGE        // メインページ閲覧中
  GROUP_ACTIVITY   // グループ活動中
  QUESTIONS        // 質問回答中
  COMPLETED        // 完了
}

// ============================================
// Big Five診断結果
// ============================================
model BigFiveResult {
  id                String   @id @default(uuid())
  studentId        String   @unique
  extraversion     Int      // 0-8
  agreeableness    Int      // 0-8
  conscientiousness Int     // 0-8
  neuroticism      Int      // 0-8
  openness         Int      // 0-8
  completedAt      DateTime @default(now())

  // Relations
  student          Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@map("big_five_results")
}

// ============================================
// 学生回答
// ============================================
model StudentResponse {
  id           String        @id @default(uuid())
  studentId    String
  sessionId    String
  questionId   String
  responseValue ResponseValue
  answeredAt   DateTime      @default(now())

  // Relations
  student      Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  session      Session       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question     Question      @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([studentId, questionId])
  @@index([studentId])
  @@index([sessionId])
  @@index([questionId])
  @@index([answeredAt])
  @@map("student_responses")
}

enum ResponseValue {
  YES      // はい
  NO       // いいえ
  UNKNOWN  // わからない
}

// ============================================
// グループ活動
// ============================================
model GroupActivity {
  id          String   @id @default(uuid())
  studentId   String
  sessionId   String
  selections  Json     // 選択した項目の配列
  freeText    String?  @db.Text // 自由記入テキスト
  createdAt   DateTime @default(now())

  // Relations
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([studentId, sessionId])
  @@index([studentId])
  @@index([sessionId])
  @@map("group_activities")
}

// ============================================
// 意見マッピング
// ============================================
model OpinionMapping {
  id            String   @id @default(uuid())
  sessionId     String   @unique
  mappingData   Json     // UMAP座標データ: { studentId: [x, y], ... }
  clusterData   Json     // クラスタリング結果: { studentId: clusterId, ... }
  conflictAreas Json?    // 対立領域: [{ clusterIds: [id1, id2], strength: number, ... }]
  consensusAreas Json?   // 合意領域: [{ clusterId: id, strength: number, ... }]
  umapParams    Json?    // UMAPパラメータ: { n_neighbors, min_dist, metric, ... }
  generatedAt   DateTime @default(now())

  // Relations
  session       Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([generatedAt])
  @@map("opinion_mappings")
}

// ============================================
// 監査ログ（Future Work）
// ============================================
model AuditLog {
  id          String   @id @default(uuid())
  userId      String?  // 管理者ID
  action      String   @db.VarChar(100) // アクション種別
  resource    String?  @db.VarChar(100) // リソース種別
  resourceId  String?  // リソースID
  details     Json?    // 詳細情報
  ipAddress   String?  @db.VarChar(45)  // IPv4/IPv6
  userAgent   String?  @db.Text
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([resource])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## 4. インデックス戦略

### 4.1 主要インデックス

| テーブル | インデックス | 目的 |
|---------|------------|------|
| Session | `schoolId`, `themeId`, `status`, `createdAt` | セッション検索、フィルタリング |
| Student | `sessionId`, `progressStatus`, `lastAccessAt` | 学生一覧、進捗監視 |
| StudentResponse | `studentId`, `sessionId`, `questionId`, `answeredAt` | 回答データ取得、集計 |
| Question | `themeId`, `order` | 質問順序取得 |
| OpinionMapping | `sessionId`, `generatedAt` | マッピングデータ取得 |

### 4.2 複合インデックス

```prisma
// StudentResponse: セッション単位での回答取得を高速化
@@index([sessionId, questionId])
@@index([sessionId, answeredAt])

// Student: セッション単位での学生一覧を高速化
@@index([sessionId, progressStatus])
```

---

## 5. データ型の詳細

### 5.1 JSON型の使用

- **GroupActivity.selections**: `string[]` - 選択した項目の配列
- **OpinionMapping.mappingData**: `{ [studentId: string]: [number, number] }` - UMAP座標
- **OpinionMapping.clusterData**: `{ [studentId: string]: number }` - クラスタID
- **OpinionMapping.conflictAreas**: `Array<{ clusterIds: [string, string], strength: number }>` - 対立領域
- **OpinionMapping.consensusAreas**: `Array<{ clusterId: string, strength: number }>` - 合意領域
- **OpinionMapping.umapParams**: `{ n_neighbors: number, min_dist: number, metric: string }` - UMAPパラメータ

### 5.2 列挙型（Enum）

- **SessionStatus**: PREPARING, ACTIVE, COMPLETED, ARCHIVED
- **StudentProgressStatus**: NOT_STARTED, BIG_FIVE, THEME_SELECTION, MAIN_PAGE, GROUP_ACTIVITY, QUESTIONS, COMPLETED
- **ResponseValue**: YES, NO, UNKNOWN
- **QuestionType**: YES_NO_UNKNOWN（将来の拡張に対応）

---

## 6. リレーション設計

### 6.1 カスケード削除

- **Student → BigFiveResult**: `onDelete: Cascade` - 学生削除時に診断結果も削除
- **Student → StudentResponse**: `onDelete: Cascade` - 学生削除時に回答も削除
- **Session → StudentResponse**: `onDelete: Cascade` - セッション削除時に回答も削除
- **Question → StudentResponse**: `onDelete: Cascade` - 質問削除時に回答も削除

### 6.2 一意制約

- **StudentResponse**: `[studentId, questionId]` - 1学生1質問につき1回答のみ
- **GroupActivity**: `[studentId, sessionId]` - 1学生1セッションにつき1グループ活動のみ
- **OpinionMapping**: `sessionId` - 1セッションにつき1マッピングのみ

---

## 7. マイグレーション戦略

### 7.1 初期マイグレーション

```bash
# 初回マイグレーション
npx prisma migrate dev --name init

# 本番環境への適用
npx prisma migrate deploy
```

### 7.2 マイグレーションファイル管理

- **開発環境**: `prisma/migrations/` ディレクトリに保存
- **バージョン管理**: Gitで管理
- **本番適用**: CI/CDパイプラインで自動適用

---

## 8. シードデータ

### 8.1 開発用シードデータ

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // テーマの作成
  const theme = await prisma.theme.create({
    data: {
      title: 'AIと人間の未来',
      description: 'AIが人間の仕事を奪うことについて考える',
      status: 'ACTIVE',
    },
  })

  // 質問の作成（20問）
  const questions = [
    { order: 1, questionText: 'AIが人間の仕事を奪うことについて、あなたはどう思いますか？' },
    { order: 2, questionText: '未来の社会はより公平になると思いますか？' },
    // ... 残り18問
  ]

  for (const q of questions) {
    await prisma.question.create({
      data: {
        ...q,
        themeId: theme.id,
        questionType: 'YES_NO_UNKNOWN',
      },
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### 8.2 シード実行

```bash
npx prisma db seed
```

---

## 9. パフォーマンス考慮事項

### 9.1 クエリ最適化

- **ページネーション**: 学生一覧は20件ずつ取得
- **集計クエリ**: DB側で集計（COUNT, AVG等）
- **JOIN最適化**: 必要なリレーションのみJOIN

### 9.2 データベース接続プール

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/sf_prototyping?connection_limit=10&pool_timeout=20"
```

---

## 10. バックアップ・災害復旧

### 10.1 バックアップ戦略

- **頻度**: 1日1回（深夜）
- **保存期間**: 30日間
- **保存先**: クラウドストレージ（AWS S3、Google Cloud Storage）

### 10.2 災害復旧計画

- **RTO（目標復旧時間）**: 4時間以内
- **RPO（目標復旧時点）**: 24時間以内
- **復旧手順**: ドキュメント化、定期的な復旧訓練

---

## 11. 次のステップ

1. **Prismaスキーマの実装**: `prisma/schema.prisma` ファイルの作成
2. **マイグレーション実行**: 初期マイグレーションの実行
3. **シードデータ作成**: 開発用データの投入
4. **Prisma Client生成**: `npx prisma generate` の実行
