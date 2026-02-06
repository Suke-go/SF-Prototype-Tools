# システムアーキテクチャ設計書

## 1. アーキテクチャ概要

### 1.1 全体構成

本システムは**クライアントサイド処理優先**の設計で、サーバー負荷を最小化する。UMAP計算やクラスタリングなどの重い処理はWebAssembly（WASM）でクライアント側で実行する。

```
┌─────────────────────────────────────────────────────────┐
│                    クライアント（ブラウザ）                │
├─────────────────────────────────────────────────────────┤
│  Next.js 14+ (App Router)                              │
│  ├─ フロントエンド（React + TypeScript）                │
│  ├─ API Routes（バックエンド）                          │
│  └─ 状態管理（Zustand）                                 │
│                                                         │
│  Web Worker                                             │
│  ├─ UMAP計算（WASM/JavaScript）                        │
│  ├─ クラスタリング（WASM/JavaScript）                  │
│  └─ 距離計算                                            │
│                                                         │
│  可視化エンジン                                          │
│  ├─ D3.js / Observable Plot                           │
│  └─ Canvas / SVG                                        │
└─────────────────────────────────────────────────────────┘
                        ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────┐
│                    サーバー（Vercel）                     │
├─────────────────────────────────────────────────────────┤
│  Next.js API Routes                                     │
│  ├─ RESTful API                                        │
│  ├─ SSE（Server-Sent Events）                          │
│  └─ 認証・認可ミドルウェア                              │
└─────────────────────────────────────────────────────────┘
                        ↕ Prisma ORM
┌─────────────────────────────────────────────────────────┐
│                  データベース（PostgreSQL）                │
├─────────────────────────────────────────────────────────┤
│  Prisma ORM                                             │
│  ├─ スキーマ定義                                        │
│  ├─ マイグレーション                                    │
│  └─ クエリ最適化                                        │
└─────────────────────────────────────────────────────────┘
```

### 1.2 技術スタック

#### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript (strict mode)
- **スタイリング**: Tailwind CSS（カスタムテーマ）
- **状態管理**: Zustand
- **UIコンポーネント**: カスタムコンポーネントライブラリ
- **可視化**: D3.js または Observable Plot
- **計算エンジン**: WebAssembly（Rust実装、UMAP、クラスタリング）

#### バックエンド
- **フレームワーク**: Next.js API Routes
- **データベース**: PostgreSQL（Prisma ORM）
- **リアルタイム通信**: Server-Sent Events (SSE)
- **認証**: JWT（アクセストークン15分、リフレッシュトークン8時間）
- **セキュリティ**: bcrypt（パスコードハッシュ化）、CSRF対策、XSS対策

#### インフラ
- **ホスティング**: Vercel
- **データベース**: PostgreSQL（マネージドサービス推奨）
- **CI/CD**: GitHub Actions
- **モニタリング**: Sentry、Vercel Analytics

### 1.3 設計原則

1. **クライアントサイド処理優先**: 重い計算はクライアント側で実行し、サーバー負荷を最小化
2. **一セッション対応（初期実装）**: 将来的にマルチセッション対応可能な設計
3. **パフォーマンス重視**: ChromeBookでも快適に動作するよう最適化
4. **セキュリティファースト**: OWASP ASVS Level 2相当のセキュリティ基準
5. **アクセシビリティ**: WCAG 2.1 AA準拠（推奨：AAA準拠）

---

## 2. ディレクトリ構造

### 2.1 プロジェクト構造

```
sf-prototyping-platform/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # 管理者向けルート
│   │   ├── dashboard/           # ダッシュボード
│   │   ├── session/             # セッション管理
│   │   └── analysis/            # 結果分析
│   ├── (student)/                # 生徒向けルート
│   │   ├── session/[id]/        # セッション参加
│   │   ├── diagnosis/           # Big Five診断
│   │   ├── theme/               # テーマ選択
│   │   ├── questions/           # 質問回答
│   │   └── visualization/       # 意見マッピング
│   ├── api/                      # API Routes
│   │   ├── auth/                # 認証
│   │   ├── session/             # セッション管理
│   │   ├── big-five/            # Big Five診断
│   │   ├── responses/           # 回答
│   │   ├── visualization/       # 可視化
│   │   └── events/              # SSE
│   ├── layout.tsx               # ルートレイアウト
│   └── page.tsx                  # ホームページ
│
├── components/                   # Reactコンポーネント
│   ├── ui/                      # 基本UIコンポーネント
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── ProgressBar.tsx
│   │   └── Accordion.tsx
│   ├── admin/                   # 管理者向けコンポーネント
│   │   ├── Dashboard.tsx
│   │   ├── StudentList.tsx
│   │   └── SessionManager.tsx
│   ├── student/                 # 生徒向けコンポーネント
│   │   ├── BigFiveDiagnosis.tsx
│   │   ├── QuestionAnswer.tsx
│   │   └── Visualization.tsx
│   └── shared/                  # 共通コンポーネント
│       ├── Header.tsx
│       └── Footer.tsx
│
├── lib/                          # ユーティリティ・ライブラリ
│   ├── prisma/                  # Prisma Client
│   ├── auth/                    # 認証関連
│   │   ├── jwt.ts
│   │   ├── session.ts
│   │   └── middleware.ts
│   ├── utils/                   # ユーティリティ関数
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── errors.ts
│   └── stores/                  # Zustandストア
│       ├── sessionStore.ts
│       ├── studentStore.ts
│       └── adminStore.ts
│
├── workers/                      # Web Workers
│   ├── umap.worker.ts           # UMAP計算
│   ├── clustering.worker.ts     # クラスタリング
│   └── distance.worker.ts       # 距離計算
│
├── wasm/                         # WebAssemblyモジュール
│   ├── umap/                    # UMAP実装（Rust）
│   ├── clustering/              # クラスタリング実装（Rust）
│   └── distance/                # 距離計算実装（Rust）
│
├── styles/                       # スタイル
│   ├── globals.css              # グローバルスタイル
│   └── tokens.css               # デザイントークン
│
├── prisma/                       # Prismaスキーマ
│   ├── schema.prisma
│   └── migrations/
│
├── public/                        # 静的ファイル
│   ├── images/
│   └── fonts/
│
├── types/                         # TypeScript型定義
│   ├── api.ts
│   ├── database.ts
│   └── components.ts
│
├── tests/                        # テスト
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                         # ドキュメント
│   ├── design/
│   ├── api/
│   └── deployment/
│
├── .github/                       # GitHub Actions
│   └── workflows/
│
├── next.config.js                # Next.js設定
├── tailwind.config.js            # Tailwind設定
├── tsconfig.json                 # TypeScript設定
├── package.json
└── README.md
```

---

## 3. データフロー

### 3.1 学生回答の保存フロー

```
[学生: 回答入力]
  ↓
[クライアント: バリデーション]
  ↓
[クライアント: LocalStorageに一時保存（オフライン対応）]
  ↓
[API: POST /api/responses（非同期、バックグラウンド）]
  ↓
[サーバー: バリデーション、認証チェック]
  ↓
[データベース: StudentResponseレコード作成/更新]
  ↓
[SSE: 進捗更新をブロードキャスト]
  ↓
[管理者ダッシュボード: 自動更新]
```

### 3.2 意見マッピング生成フロー

```
[管理者: マッピング生成リクエスト]
  ↓
[API: GET /api/session/responses]
  ↓
[クライアント: 全回答データ取得]
  ↓
[Web Worker: データ前処理（25次元ベクトル生成）]
  ↓
[Web Worker: WASM UMAP計算（非同期）]
  ↓
[Web Worker: クラスタリング（非同期）]
  ↓
[Web Worker: 対立・合意領域の検出]
  ↓
[メインスレッド: D3.js可視化レンダリング]
  ↓
[画面: マッピング表示]
  ↓
[IndexedDB: 計算結果をキャッシュ]
```

### 3.3 リアルタイム監視フロー

```
[管理者: ダッシュボード表示]
  ↓
[SSE: 接続確立（/api/events/session/progress）]
  ↓
[サーバー: 5秒ごとに進捗データを送信]
  ↓
[クライアント: EventSourceで受信]
  ↓
[クライアント: 状態更新（Zustand）]
  ↓
[画面: 自動リフレッシュ（差分更新）]
```

---

## 4. セキュリティアーキテクチャ

### 4.1 認証フロー

```
[管理者: ログイン]
  ↓
[API: POST /api/auth/login]
  ├─ セッションID + パスコード検証
  ├─ bcryptでパスコード検証
  └─ JWTトークン発行（アクセストークン15分、リフレッシュトークン8時間）
  ↓
[クライアント: HttpOnly Cookieに保存]
  ↓
[以降のAPIリクエスト: CookieからJWT取得、検証]
```

### 4.2 認可フロー

```
[APIリクエスト]
  ↓
[ミドルウェア: JWT検証]
  ↓
[ミドルウェア: ロールチェック（Admin / Student）]
  ↓
[ミドルウェア: セッション境界チェック]
  ↓
[APIハンドラー: ビジネスロジック実行]
```

### 4.3 セキュリティ対策

- **CSRF対策**: Synchronizer Tokenまたは二重送信Cookie
- **XSS対策**: 入力サニタイズ、出力エスケープ、Reactの自動エスケープ
- **CSP**: Content Security Policy設定
- **セキュリティヘッダ**: HSTS、X-Content-Type-Options、Referrer-Policy
- **レート制限**: IP/ユーザー/セッション単位で上限設定
- **ログイン失敗制御**: 5回失敗で15分ロックアウト

---

## 5. パフォーマンス最適化戦略

### 5.1 クライアントサイド最適化

- **コード分割**: Next.js動的インポートでWASMモジュールを遅延ロード
- **画像最適化**: Next.js Imageコンポーネント、WebP形式
- **バンドルサイズ**: Tree shaking、未使用コードの削除
- **キャッシング**: IndexedDB（計算結果）、SWR/React Query（データ取得）
- **仮想スクロール**: 学生一覧が100人以上の場合

### 5.2 サーバーサイド最適化

- **SSG/ISR**: 静的生成、インクリメンタル静的再生成
- **データベースクエリ最適化**: インデックス追加、EXPLAIN分析
- **ページネーション**: 学生一覧は20件ずつ取得
- **集計クエリ**: DB側で集計（COUNT, AVG等）
- **キャッシング**: Redis（オプション）、SWR/React Query

### 5.3 WASM最適化

- **Rustコンパイル**: 最適化フラグ（`-O3`）
- **Web Worker**: メインスレッドをブロックしない
- **段階的計算**: 学生数に応じてプログレスバー表示

---

## 6. エラーハンドリング戦略

### 6.1 クライアント側

- **ネットワークエラー**: 自動リトライ（指数バックオフ）、オフライン対応
- **バリデーションエラー**: リアルタイムバリデーション、エラーメッセージ表示
- **認証エラー**: 自動ログアウト、ログイン画面へリダイレクト
- **クライアント側エラー**: React Error Boundary、Sentryに送信
- **SSE切断**: 再接続中バナー表示、最大再試行回数超過時に手動再接続UI

### 6.2 サーバー側

- **エラーログ**: 構造化ログ（JSON形式）
- **エラーレスポンス**: JSON形式、適切なHTTPステータスコード
- **APIレスポンス仕様**: OpenAPIまたはJSON Schemaで定義
- **SSE復旧戦略**: イベントIDを保持し、再接続時に欠落イベントを再送

---

## 7. モニタリング・ログ戦略

### 7.1 ログ戦略

- **サーバー側**: Winston（Node.js）、構造化ログ
- **クライアント側**: Sentry、LogRocket

### 7.2 モニタリング

- **パフォーマンス**: Vercel Analytics、New Relic、Datadog
- **エラー追跡**: Sentry
- **ユーザー行動分析**: Google Analytics（匿名化）、Plausible Analytics

### 7.3 監査ログ

- **対象**: ログイン、設定変更、データ閲覧、エクスポート、権限変更
- **要件**: 改ざん耐性（WORMまたは同等）、保持期間、アクセス制御、閲覧監査

---

## 8. デプロイメントアーキテクチャ

### 8.1 環境構成

```
開発環境（ローカル）
  ↓
ステージング環境（Vercel Preview）
  ↓
本番環境（Vercel Production）
```

### 8.2 CI/CDパイプライン

```
[Git Push]
  ↓
[GitHub Actions]
  ├─ リントチェック
  ├─ 型チェック
  ├─ 単体テスト
  ├─ ビルドテスト
  └─ SAST/SCA
  ↓
[プルリクエスト]
  ↓
[マージ]
  ↓
[統合テスト]
  ↓
[ステージング環境へデプロイ]
  ↓
[E2Eテスト]
  ↓
[本番環境へデプロイ]
```

---

## 9. スケーラビリティ考慮事項

### 9.1 一セッション対応（初期実装）

- **同時セッション数**: 1セッション
- **セッション管理**: 現在のセッションのみを管理
- **データベース**: セッションIDによるインデックスで高速クエリ
- **SSE接続数**: 管理者1人あたり1接続

### 9.2 将来のマルチセッション対応

- **データモデル**: 既にマルチセッション対応可能な設計
- **拡張性**: セッション単位でのデータ分離が可能
- **リソース管理**: クライアント側処理によりサーバー負荷を最小化

---

## 10. 依存関係管理

### 10.1 主要な依存関係

- **Next.js**: 14.0.0以上
- **React**: 18.0.0以上
- **TypeScript**: 5.0.0以上
- **Prisma**: 5.0.0以上
- **Zustand**: 4.0.0以上
- **Tailwind CSS**: 3.0.0以上

### 10.2 セキュリティ更新

- **Dependabot/Renovate**: 依存関係の自動更新
- **npm audit**: 脆弱性スキャン
- **定期的な更新**: 月次で依存関係を更新

---

## 11. 次のステップ

1. **データベース設計書の作成**: Prismaスキーマの詳細設計
2. **API設計書の作成**: エンドポイントの詳細仕様
3. **UI/UX設計書の作成**: コンポーネント設計、画面遷移図
4. **デザイントークン定義書の作成**: カラーパレット、タイポグラフィ、スペーシング
