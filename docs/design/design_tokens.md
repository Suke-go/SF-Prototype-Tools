# デザイントークン定義書

## 1. 概要

本システムは**生徒向けダークUI**と**管理者向けライトUI**の二層構造を持つが、共通のデザイントークン体系で統一する。Figmaと実装（Tailwind/TypeScript）の命名を一致させる。

---

## 2. カラーパレット

### 2.1 生徒側（ダークUI）

#### 背景色
```css
--background-primary: #000000;      /* 純黒、メイン背景 */
--background-secondary: #1a1a1a;    /* ダークグレー、セカンダリ背景 */
--background-tertiary: #2d2d2d;     /* ミディアムグレー、カード背景 */
--background-elevated: #404040;     /* ライトグレー、浮き上がった要素 */
```

#### テキスト色
```css
--text-primary: #ffffff;            /* 白、主要テキスト */
--text-secondary: #e0e0e0;         /* ライトグレー、セカンダリテキスト */
--text-tertiary: #b0b0b0;          /* ミディアムグレー、補足テキスト */
--text-disabled: #808080;           /* グレー、無効化テキスト */
```

#### アクセント色（限定的使用）
```css
--accent-red: #c62828;              /* 赤、質問回答の「はい」ボタン、マットな質感 */
--accent-blue: #1976d2;             /* 青、質問回答の「いいえ」ボタン、マットな質感 */
--accent-gray: #616161;             /* グレー、質問回答の「わからない」ボタン、マットな質感 */
```

#### ボーダー色
```css
--border-primary: #404040;         /* ライトグレー、主要ボーダー */
--border-secondary: #2d2d2d;       /* ミディアムグレー、セカンダリボーダー */
```

#### コントラスト比
- テキストと背景：7:1以上（WCAG 2.1 AAA準拠）
- 大きなテキスト（18px以上）：4.5:1以上（WCAG 2.1 AA準拠）

### 2.2 管理者側（ライトUI）

#### 背景色
```css
--background-primary: #ffffff;      /* 白、メイン背景 */
--background-secondary: #f5f5f5;     /* ライトグレー、セカンダリ背景 */
--background-tertiary: #e0e0e0;     /* ミディアムグレー、区切り線 */
--background-elevated: #ffffff;      /* 白、カード背景 */
```

#### テキスト色
```css
--text-primary: #000000;            /* 黒、主要テキスト */
--text-secondary: #424242;         /* ダークグレー、セカンダリテキスト */
--text-tertiary: #757575;          /* ミディアムグレー、補足テキスト */
--text-disabled: #bdbdbd;          /* ライトグレー、無効化テキスト */
```

#### セマンティックカラー
```css
--semantic-error: #d32f2f;          /* 赤、エラー */
--semantic-success: #388e3c;        /* 緑、成功 */
--semantic-warning: #f57c00;        /* オレンジ、警告 */
--semantic-info: #1976d2;           /* 青、情報 */
```

#### アクセント色
```css
--accent-primary: #1976d2;          /* 青、主要アクセント */
--accent-secondary: #424242;        /* グレー、セカンダリアクセント */
```

#### ボーダー色
```css
--border-primary: #e0e0e0;         /* ミディアムグレー、主要ボーダー */
--border-secondary: #bdbdbd;        /* ライトグレー、セカンダリボーダー */
```

#### コントラスト比
- テキストと背景：7:1以上（WCAG 2.1 AAA準拠）
- 大きなテキスト（18px以上）：4.5:1以上（WCAG 2.1 AA準拠）

---

## 3. タイポグラフィ

### 3.1 フォントファミリー

```css
/* 見出し（セリフ体、重厚感） */
--font-heading: 'Noto Serif JP', '游明朝', serif;

/* 本文（サンセリフ体、読みやすさ） */
--font-body: 'Noto Sans JP', '游ゴシック', sans-serif;

/* 等幅（コード、数値表示） */
--font-mono: 'Courier New', 'Monaco', monospace;
```

### 3.2 タイポグラフィスケール

#### 生徒側
```css
/* H1（大見出し） */
--font-size-h1: 48px;
--line-height-h1: 1.2;
--font-weight-h1: 700;

/* H2（中見出し） */
--font-size-h2: 36px;
--line-height-h2: 1.3;
--font-weight-h2: 700;

/* H3（小見出し） */
--font-size-h3: 28px;
--line-height-h3: 1.4;
--font-weight-h3: 600;

/* H4（サブ見出し） */
--font-size-h4: 24px;
--line-height-h4: 1.5;
--font-weight-h4: 600;

/* Body-Large（本文大） */
--font-size-body-large: 20px;
--line-height-body-large: 1.6;
--font-weight-body-large: 400;

/* Body（本文） */
--font-size-body: 18px;
--line-height-body: 1.7;
--font-weight-body: 400;

/* Body-Small（本文小） */
--font-size-body-small: 16px;
--line-height-body-small: 1.6;
--font-weight-body-small: 400;

/* Caption（キャプション） */
--font-size-caption: 14px;
--line-height-caption: 1.5;
--font-weight-caption: 400;

/* Small（小文字） */
--font-size-small: 12px;
--line-height-small: 1.4;
--font-weight-small: 400;
```

#### 管理者側
```css
/* H1（大見出し） */
--font-size-h1: 32px;
--line-height-h1: 1.25;
--font-weight-h1: 700;

/* H2（中見出し） */
--font-size-h2: 24px;
--line-height-h2: 1.3;
--font-weight-h2: 600;

/* H3（小見出し） */
--font-size-h3: 20px;
--line-height-h3: 1.4;
--font-weight-h3: 600;

/* H4（サブ見出し） */
--font-size-h4: 18px;
--line-height-h4: 1.5;
--font-weight-h4: 600;

/* Body-Large（本文大） */
--font-size-body-large: 18px;
--line-height-body-large: 1.6;
--font-weight-body-large: 400;

/* Body（本文） */
--font-size-body: 16px;
--line-height-body: 1.6;
--font-weight-body: 400;

/* Body-Small（本文小） */
--font-size-body-small: 14px;
--line-height-body-small: 1.5;
--font-weight-body-small: 400;

/* Caption（キャプション） */
--font-size-caption: 12px;
--line-height-caption: 1.4;
--font-weight-caption: 400;

/* Small（小文字） */
--font-size-small: 11px;
--line-height-small: 1.3;
--font-weight-small: 400;
```

### 3.3 レスポンシブタイポグラフィ

```css
/* モバイル（< 768px） */
@media (max-width: 767px) {
  --font-size-h1: calc(48px * 0.875);
  --font-size-h2: calc(36px * 0.875);
  /* ... 他のサイズも0.875倍 */
}

/* タブレット（768px - 1279px） */
@media (min-width: 768px) and (max-width: 1279px) {
  --font-size-h1: calc(48px * 0.9375);
  --font-size-h2: calc(36px * 0.9375);
  /* ... 他のサイズも0.9375倍 */
}

/* デスクトップ（> 1280px） */
@media (min-width: 1280px) {
  /* 基準サイズをそのまま使用 */
}
```

---

## 4. スペーシングシステム

### 4.1 8pxベースシステム

```css
--space-1: 4px;    /* 最小間隔 */
--space-2: 8px;    /* 小間隔 */
--space-3: 16px;   /* 中間隔 */
--space-4: 24px;   /* 大間隔 */
--space-5: 32px;   /* 特大間隔 */
--space-6: 48px;   /* 最大間隔、主要な余白 */
--space-7: 64px;   /* セクション間の余白 */
--space-8: 96px;   /* ページ間の余白 */
```

### 4.2 コンポーネントパディング

```css
/* ボタン */
--padding-button: 12px 24px;  /* space-3 × 1.5, space-4 */

/* カード（生徒側） */
--padding-card: 24px;         /* space-4 */

/* カード（管理者側） */
--padding-card-admin: 16px;   /* space-3 × 2 */

/* 入力フィールド */
--padding-input: 12px 16px;   /* space-3 × 1.5, space-3 × 2 */

/* テーブル（管理者側） */
--padding-table: 12px;        /* space-3 × 1.5 */
```

---

## 5. シャドウシステム（Elevation Levels）

### 5.1 生徒側（マットな質感）

```css
/* 光沢の排除 */
--shadow-matte: 0 2px 4px rgba(0, 0, 0, 0.3);  /* 控えめな影 */

/* ボタンホバー時 */
--shadow-button-hover: 0 4px 8px rgba(0, 0, 0, 0.4);

/* ボタンアクティブ時 */
--shadow-button-active: inset 0 2px 4px rgba(0, 0, 0, 0.2);
```

### 5.2 管理者側（Elevation Levels）

```css
--elevation-0: none;                                    /* シャドウなし（フラット） */
--elevation-1: 0 1px 3px rgba(0, 0, 0, 0.12);         /* カード */
--elevation-2: 0 2px 6px rgba(0, 0, 0, 0.15);         /* 浮き上がったカード */
--elevation-3: 0 4px 12px rgba(0, 0, 0, 0.18);         /* モーダル、ドロップダウン */
```

---

## 6. ボーダー・角丸

### 6.1 ボーダー

```css
--border-width-thin: 1px;
--border-width-medium: 2px;
--border-width-thick: 4px;

--border-style-solid: solid;
--border-style-dashed: dashed;
```

### 6.2 角丸

```css
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;  /* 円形 */
```

---

## 7. アニメーション

### 7.1 Duration（持続時間）

```css
--duration-fast: 150ms;    /* 即時フィードバック */
--duration-normal: 300ms;   /* 標準トランジション */
--duration-slow: 500ms;    /* ページ遷移、フェード */
```

### 7.2 Easing（イージング関数）

```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);  /* 標準的なトランジション */
--ease-out: cubic-bezier(0, 0, 0.2, 1);        /* 要素の出現 */
--ease-in: cubic-bezier(0.4, 0, 1, 1);         /* 要素の消失 */
```

### 7.3 アニメーションタイプ

```css
/* フェードイン/アウト */
--animation-fade: opacity 0.3s var(--ease-in-out);

/* スライドイン */
--animation-slide: transform 0.3s var(--ease-out);

/* スケール */
--animation-scale: transform 0.15s var(--ease-out);

/* 浮上アニメーション */
--animation-float: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
```

### 7.4 パフォーマンス最適化

```css
/* GPU加速 */
--will-change-transform: will-change: transform;
--will-change-opacity: will-change: opacity;
```

---

## 8. コンポーネント状態

### 8.1 ボタン状態

```css
/* Default */
--button-bg-default: var(--background-tertiary);
--button-text-default: var(--text-primary);

/* Hover */
--button-bg-hover: brightness(1.1);  /* 10%明るく */
--button-text-hover: var(--text-primary);

/* Active */
--button-bg-active: brightness(0.9);  /* 10%暗く */
--button-shadow-active: var(--shadow-button-active);

/* Disabled */
--button-opacity-disabled: 0.5;
--button-cursor-disabled: not-allowed;

/* Focus */
--button-outline-focus: 2px solid var(--text-primary);
--button-outline-offset-focus: 2px;
```

### 8.2 入力フィールド状態

```css
/* Default */
--input-border-default: 1px solid var(--border-primary);
--input-bg-default: var(--background-secondary);

/* Focus */
--input-border-focus: 1px solid var(--text-primary);
--input-shadow-focus: 0 0 0 2px rgba(255, 255, 255, 0.2);

/* Error */
--input-border-error: 1px solid var(--accent-red);
--input-text-error: var(--accent-red);

/* Disabled */
--input-opacity-disabled: 0.5;
--input-cursor-disabled: not-allowed;
```

---

## 9. Tailwind CSS設定

### 9.1 tailwind.config.js

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // 生徒側（ダークUI）
        'student': {
          'bg-primary': '#000000',
          'bg-secondary': '#1a1a1a',
          'bg-tertiary': '#2d2d2d',
          'bg-elevated': '#404040',
          'text-primary': '#ffffff',
          'text-secondary': '#e0e0e0',
          'text-tertiary': '#b0b0b0',
          'text-disabled': '#808080',
          'accent-red': '#c62828',
          'accent-blue': '#1976d2',
          'accent-gray': '#616161',
          'border-primary': '#404040',
          'border-secondary': '#2d2d2d',
        },
        // 管理者側（ライトUI）
        'admin': {
          'bg-primary': '#ffffff',
          'bg-secondary': '#f5f5f5',
          'bg-tertiary': '#e0e0e0',
          'bg-elevated': '#ffffff',
          'text-primary': '#000000',
          'text-secondary': '#424242',
          'text-tertiary': '#757575',
          'text-disabled': '#bdbdbd',
          'semantic-error': '#d32f2f',
          'semantic-success': '#388e3c',
          'semantic-warning': '#f57c00',
          'semantic-info': '#1976d2',
          'accent-primary': '#1976d2',
          'accent-secondary': '#424242',
          'border-primary': '#e0e0e0',
          'border-secondary': '#bdbdbd',
        },
      },
      fontFamily: {
        'heading': ['Noto Serif JP', '游明朝', 'serif'],
        'body': ['Noto Sans JP', '游ゴシック', 'sans-serif'],
        'mono': ['Courier New', 'Monaco', 'monospace'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '16px',
        '4': '24px',
        '5': '32px',
        '6': '48px',
        '7': '64px',
        '8': '96px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      },
    },
  },
}
```

---

## 10. TypeScript型定義

### 10.1 design-tokens.ts

```typescript
export type ColorToken = 
  | 'student.bg-primary'
  | 'student.bg-secondary'
  | 'student.text-primary'
  | 'admin.bg-primary'
  | 'admin.text-primary'
  // ... 他のトークン

export type SpacingToken = 
  | 'space-1'
  | 'space-2'
  | 'space-3'
  // ... 他のスペーシング

export type TypographyToken = 
  | 'h1'
  | 'h2'
  | 'body'
  // ... 他のタイポグラフィ

export interface DesignTokens {
  colors: Record<ColorToken, string>
  spacing: Record<SpacingToken, string>
  typography: Record<TypographyToken, {
    fontSize: string
    lineHeight: string
    fontWeight: number
  }>
  // ... 他のトークン
}
```

---

## 11. Figmaとの連携

### 11.1 命名規則の統一

- **Figma**: `student/bg-primary`, `admin/text-primary`
- **実装**: `student.bg-primary`, `admin.text-primary`

### 11.2 トークンエクスポート

Figmaからトークンをエクスポートし、TypeScript/Tailwind設定に自動反映するツールを使用（例：Figma Tokens、Style Dictionary）。

---

## 12. 次のステップ

1. **Figmaトークンの作成**: Figmaでデザイントークンを定義
2. **Tailwind設定の実装**: `tailwind.config.js`の実装
3. **CSS変数の実装**: `styles/tokens.css`の作成
4. **TypeScript型定義**: `types/design-tokens.ts`の作成
5. **トークン検証**: 実装とFigmaの整合性確認
