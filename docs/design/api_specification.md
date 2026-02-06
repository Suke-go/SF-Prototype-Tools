# API設計書

## 1. 概要

本システムのAPIはRESTful設計に基づき、Next.js API Routesで実装する。認証はJWTトークンを使用し、リアルタイム通信はServer-Sent Events (SSE)を使用する。

### 1.1 ベースURL

- **開発環境**: `http://localhost:3000/api`
- **本番環境**: `https://your-domain.com/api`

### 1.2 認証方式

- **管理者**: JWTトークン（HttpOnly Cookie）
- **学生**: セッションID（CookieまたはLocalStorage）

### 1.3 レスポンス形式

すべてのAPIレスポンスはJSON形式。

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": { ... }
  }
}
```

### 1.4 HTTPステータスコード

- `200 OK`: 成功
- `201 Created`: 作成成功
- `400 Bad Request`: リクエストエラー
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 認可エラー
- `404 Not Found`: リソースが見つからない
- `429 Too Many Requests`: レート制限超過
- `500 Internal Server Error`: サーバーエラー

---

## 2. 認証API

### 2.1 管理者ログイン

**エンドポイント**: `POST /api/auth/login`

**リクエスト**:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "passcode": "password123"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "AIと人間の未来",
      "status": "ACTIVE"
    }
  }
}
```

**エラーレスポンス**:
- `401 Unauthorized`: セッションIDまたはパスコードが不正
- `429 Too Many Requests`: ログイン失敗回数が上限に達した（15分ロックアウト）

**レート制限**: 5回/15分（IP単位）

---

### 2.2 トークンリフレッシュ

**エンドポイント**: `POST /api/auth/refresh`

**リクエスト**: Cookieからリフレッシュトークンを取得

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**エラーレスポンス**:
- `401 Unauthorized`: リフレッシュトークンが無効または期限切れ

---

### 2.3 ログアウト

**エンドポイント**: `POST /api/auth/logout`

**リクエスト**: なし（Cookieからトークンを取得）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "ログアウトしました"
  }
}
```

---

## 3. セッション管理API

### 3.1 セッション作成

**エンドポイント**: `POST /api/session`

**認証**: 管理者のみ

**リクエスト**:
```json
{
  "title": "AIと人間の未来",
  "description": "AIが人間の仕事を奪うことについて考える",
  "themeId": "theme-uuid",
  "maxParticipants": 50,
  "passcode": "password123"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "AIと人間の未来",
      "status": "PREPARING",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**バリデーション**:
- `title`: 必須、最大100文字
- `description`: 任意、最大500文字
- `themeId`: 必須、UUID形式
- `maxParticipants`: 必須、1-200の整数
- `passcode`: 必須、8文字以上の英数字

---

### 3.2 現在のセッション取得

**エンドポイント**: `GET /api/session/current`

**認証**: 管理者または学生

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "AIと人間の未来",
      "description": "AIが人間の仕事を奪うことについて考える",
      "themeId": "theme-uuid",
      "status": "ACTIVE",
      "maxParticipants": 50,
      "currentParticipants": 25,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**エラーレスポンス**:
- `404 Not Found`: セッションが見つからない

---

### 3.3 セッション更新

**エンドポイント**: `PUT /api/session`

**認証**: 管理者のみ

**リクエスト**:
```json
{
  "status": "ACTIVE",
  "maxParticipants": 100
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "ACTIVE",
      "maxParticipants": 100,
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

### 3.4 セッション削除

**エンドポイント**: `DELETE /api/session`

**認証**: 管理者のみ

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "セッションを削除しました"
  }
}
```

---

## 4. Big Five診断API

### 4.1 診断結果保存

**エンドポイント**: `POST /api/big-five/results`

**認証**: 学生（セッションID）

**リクエスト**:
```json
{
  "answers": [
    { "questionNumber": 1, "score": 3 },
    { "questionNumber": 2, "score": 4 },
    // ... 10問分
  ]
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "result": {
      "id": "result-uuid",
      "extraversion": 6,
      "agreeableness": 7,
      "conscientiousness": 5,
      "neuroticism": 3,
      "openness": 8,
      "completedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**バリデーション**:
- `answers`: 必須、10問分の配列
- `questionNumber`: 1-10の整数
- `score`: 0-4の整数

---

### 4.2 診断結果取得

**エンドポイント**: `GET /api/big-five/results`

**認証**: 学生（自分の結果のみ）または管理者（全結果）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "result": {
      "id": "result-uuid",
      "extraversion": 6,
      "agreeableness": 7,
      "conscientiousness": 5,
      "neuroticism": 3,
      "openness": 8,
      "completedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

## 5. テーマ・質問API

### 5.1 テーマ一覧取得

**エンドポイント**: `GET /api/themes`

**認証**: 不要

**クエリパラメータ**:
- `status`: ACTIVE（デフォルト）またはINACTIVE

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "themes": [
      {
        "id": "theme-uuid",
        "title": "AIと人間の未来",
        "description": "AIが人間の仕事を奪うことについて考える",
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 5.2 質問一覧取得

**エンドポイント**: `GET /api/questions`

**認証**: 学生または管理者

**クエリパラメータ**:
- `themeId`: 必須、テーマID

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "question-uuid",
        "themeId": "theme-uuid",
        "questionText": "AIが人間の仕事を奪うことについて、あなたはどう思いますか？",
        "order": 1,
        "questionType": "YES_NO_UNKNOWN"
      }
      // ... 20問分
    ]
  }
}
```

---

## 6. 回答API

### 6.1 回答保存

**エンドポイント**: `POST /api/responses`

**認証**: 学生（セッションID）

**リクエスト**:
```json
{
  "questionId": "question-uuid",
  "responseValue": "YES"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "response": {
      "id": "response-uuid",
      "questionId": "question-uuid",
      "responseValue": "YES",
      "answeredAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**バリデーション**:
- `questionId`: 必須、UUID形式
- `responseValue`: 必須、`YES`, `NO`, `UNKNOWN`のいずれか

**レート制限**: 10回/秒（学生単位）

---

### 6.2 回答一覧取得

**エンドポイント**: `GET /api/responses`

**認証**: 学生（自分の回答のみ）または管理者（全回答）

**クエリパラメータ**:
- `sessionId`: 必須、セッションID
- `studentId`: 任意、学生ID（管理者のみ）
- `questionId`: 任意、質問ID

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "responses": [
      {
        "id": "response-uuid",
        "studentId": "student-uuid",
        "questionId": "question-uuid",
        "responseValue": "YES",
        "answeredAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    }
  }
}
```

---

## 7. 学生管理API

### 7.1 学生一覧取得

**エンドポイント**: `GET /api/students`

**認証**: 管理者のみ

**クエリパラメータ**:
- `sessionId`: 必須、セッションID
- `progressStatus`: 任意、進捗状況でフィルタリング
- `page`: 任意、ページ番号（デフォルト: 1）
- `pageSize`: 任意、1ページあたりの件数（デフォルト: 20、最大: 100）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "student-uuid",
        "name": "学生A",
        "progressStatus": "QUESTIONS",
        "bigFiveResult": {
          "extraversion": 6,
          "agreeableness": 7,
          "conscientiousness": 5,
          "neuroticism": 3,
          "openness": 8
        },
        "responseCount": 15,
        "totalQuestions": 20,
        "lastAccessAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "pageSize": 20,
      "totalPages": 3
    }
  }
}
```

---

### 7.2 学生詳細取得

**エンドポイント**: `GET /api/students/:id`

**認証**: 管理者のみ

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "student-uuid",
      "name": "学生A",
      "progressStatus": "QUESTIONS",
      "bigFiveResult": {
        "id": "result-uuid",
        "extraversion": 6,
        "agreeableness": 7,
        "conscientiousness": 5,
        "neuroticism": 3,
        "openness": 8,
        "completedAt": "2024-01-01T00:00:00Z"
      },
      "responses": [
        {
          "id": "response-uuid",
          "questionId": "question-uuid",
          "questionText": "AIが人間の仕事を奪うことについて、あなたはどう思いますか？",
          "responseValue": "YES",
          "answeredAt": "2024-01-01T00:00:00Z"
        }
      ],
      "joinedAt": "2024-01-01T00:00:00Z",
      "lastAccessAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

## 8. 可視化API

### 8.1 意見マッピング生成

**エンドポイント**: `POST /api/visualization/generate`

**認証**: 管理者のみ

**リクエスト**:
```json
{
  "sessionId": "session-uuid",
  "umapParams": {
    "n_neighbors": 20,
    "min_dist": 0.2,
    "metric": "cosine"
  }
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "mapping": {
      "id": "mapping-uuid",
      "sessionId": "session-uuid",
      "mappingData": {
        "student-uuid-1": [0.5, 0.3],
        "student-uuid-2": [-0.2, 0.8]
      },
      "clusterData": {
        "student-uuid-1": 0,
        "student-uuid-2": 1
      },
      "conflictAreas": [
        {
          "clusterIds": [0, 1],
          "strength": 0.85
        }
      ],
      "consensusAreas": [
        {
          "clusterId": 0,
          "strength": 0.92
        }
      ],
      "generatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**注意**: このAPIは計算が重いため、非同期処理を推奨。クライアント側でWASM計算を実行する場合は、このAPIは使用しない。

---

### 8.2 意見マッピング取得

**エンドポイント**: `GET /api/visualization/mapping`

**認証**: 管理者または学生

**クエリパラメータ**:
- `sessionId`: 必須、セッションID

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "mapping": {
      "id": "mapping-uuid",
      "sessionId": "session-uuid",
      "mappingData": {
        "student-uuid-1": [0.5, 0.3],
        "student-uuid-2": [-0.2, 0.8]
      },
      "clusterData": {
        "student-uuid-1": 0,
        "student-uuid-2": 1
      },
      "conflictAreas": [
        {
          "clusterIds": [0, 1],
          "strength": 0.85
        }
      ],
      "consensusAreas": [
        {
          "clusterId": 0,
          "strength": 0.92
        }
      ],
      "generatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

## 9. 統計API

### 9.1 進捗統計取得

**エンドポイント**: `GET /api/statistics/progress`

**認証**: 管理者のみ

**クエリパラメータ**:
- `sessionId`: 必須、セッションID

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalStudents": 50,
      "completedStudents": 25,
      "inProgressStudents": 15,
      "notStartedStudents": 10,
      "completionRate": 0.5,
      "averageResponseTime": 1200, // 秒
      "bigFiveAverages": {
        "extraversion": 5.2,
        "agreeableness": 6.1,
        "conscientiousness": 5.8,
        "neuroticism": 4.3,
        "openness": 6.5
      },
      "responseCountsByHour": [
        { "hour": "2024-01-01T10:00:00Z", "count": 5 },
        { "hour": "2024-01-01T11:00:00Z", "count": 10 }
      ]
    }
  }
}
```

---

### 9.2 質問ごとの解答分布取得

**エンドポイント**: `GET /api/statistics/question-distribution`

**認証**: 管理者のみ

**クエリパラメータ**:
- `sessionId`: 必須、セッションID
- `questionId`: 任意、質問ID（指定時はその質問のみ）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "distributions": [
      {
        "questionId": "question-uuid",
        "questionText": "AIが人間の仕事を奪うことについて、あなたはどう思いますか？",
        "distribution": {
          "YES": 25,
          "NO": 15,
          "UNKNOWN": 10
        },
        "percentages": {
          "YES": 0.5,
          "NO": 0.3,
          "UNKNOWN": 0.2
        },
        "clusterDistributions": {
          "0": {
            "YES": 20,
            "NO": 5,
            "UNKNOWN": 5
          },
          "1": {
            "YES": 5,
            "NO": 10,
            "UNKNOWN": 5
          }
        }
      }
    ]
  }
}
```

---

## 10. Server-Sent Events (SSE)

### 10.1 進捗状況ストリーミング

**エンドポイント**: `GET /api/events/session/progress`

**認証**: 管理者のみ

**リクエスト**: CookieからJWTトークンを取得

**レスポンス**: SSEストリーム

```
event: progress
data: {"totalStudents": 50, "completedStudents": 25, "inProgressStudents": 15}

event: progress
data: {"totalStudents": 50, "completedStudents": 26, "inProgressStudents": 14}

...
```

**イベントタイプ**:
- `progress`: 進捗状況の更新
- `student_joined`: 学生の参加
- `student_completed`: 学生の完了
- `error`: エラー発生

**再接続**: `Last-Event-ID`ヘッダーで欠落イベントを再送

**更新頻度**: 5秒ごと

**タイムアウト**: アイドル30分で自動切断

---

### 10.2 回答データストリーミング

**エンドポイント**: `GET /api/events/session/responses`

**認証**: 管理者のみ

**レスポンス**: SSEストリーム

```
event: response
data: {"studentId": "student-uuid", "questionId": "question-uuid", "responseValue": "YES"}

...
```

**イベントタイプ**:
- `response`: 新しい回答の受信
- `error`: エラー発生

---

## 11. エクスポートAPI

### 11.1 データエクスポート（CSV）

**エンドポイント**: `GET /api/export/csv`

**認証**: 管理者のみ

**クエリパラメータ**:
- `sessionId`: 必須、セッションID
- `type`: 必須、`students`, `responses`, `mapping`のいずれか

**レスポンス**: CSVファイル

**Content-Type**: `text/csv; charset=utf-8`

---

### 11.2 データエクスポート（JSON）

**エンドポイント**: `GET /api/export/json`

**認証**: 管理者のみ

**クエリパラメータ**:
- `sessionId`: 必須、セッションID

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "session": { ... },
    "students": [ ... ],
    "responses": [ ... ],
    "mapping": { ... }
  }
}
```

---

## 12. エラーハンドリング

### 12.1 エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `INVALID_REQUEST` | 400 | リクエストが不正 |
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | 権限が不足 |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `INTERNAL_ERROR` | 500 | サーバーエラー |

### 12.2 バリデーションエラーの詳細

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": {
      "field": "title",
      "message": "タイトルは必須です"
    }
  }
}
```

---

## 13. レート制限

### 13.1 レート制限設定

| エンドポイント | 制限 | 単位 |
|--------------|------|------|
| `/api/auth/login` | 5回 | 15分（IP単位） |
| `/api/responses` | 10回 | 秒（学生単位） |
| `/api/statistics/*` | 30回 | 分（管理者単位） |
| `/api/events/*` | 10接続 | 同時接続数 |

---

## 14. 次のステップ

1. **OpenAPI仕様書の作成**: Swagger/OpenAPI形式での詳細仕様
2. **API実装**: Next.js API Routesでの実装
3. **APIテスト**: 単体テスト・統合テストの作成
4. **APIドキュメント**: 自動生成ドキュメントの設定
