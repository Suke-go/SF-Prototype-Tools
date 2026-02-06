# UI/UX設計書

## 1. 概要

本システムは**生徒向けダークUI**と**管理者向けライトUI**の二層構造を持つ。各画面のレイアウト、コンポーネント設計、インタラクション仕様を定義する。

---

## 2. 画面遷移図

### 2.1 生徒フロー

```
[セッション参加]
  ↓
[Big Five診断] (10問)
  ↓
[診断結果表示]
  ↓
[テーマ選択] (4-5案)
  ↓
[メインページ] (テーマ概要)
  ↓
[グループ活動]
  ↓
[質問回答] (20問、逆三角形UI)
  ↓
[回答完了]
  ↓
[意見マッピング確認]
```

### 2.2 管理者フロー

```
[ログイン]
  ↓
[ダッシュボード] (リアルタイム監視)
  ├─ [セッション管理]
  ├─ [学生一覧]
  ├─ [進捗統計]
  └─ [結果分析] (6段階の階層構造)
```

---

## 3. 基本UIコンポーネント

### 3.1 ボタンコンポーネント

#### Primary Button（主要ボタン）

**生徒側**:
```tsx
<Button variant="primary" size="md">
  次へ
</Button>
```

**スタイル**:
- 背景色: `student.bg-tertiary` (#2d2d2d)
- テキスト色: `student.text-primary` (#ffffff)
- パディング: `12px 24px`
- 最小高さ: `44px`
- 角丸: `8px`
- ホバー時: 背景色を10%明るく
- アクティブ時: `inset shadow`
- フォーカス: `2px solid #ffffff`、`outline-offset: 2px`

**管理者側**:
```tsx
<Button variant="primary" size="md">
  保存
</Button>
```

**スタイル**:
- 背景色: `admin.accent-primary` (#1976d2)
- テキスト色: `admin.text-primary` (#ffffff)
- その他は生徒側と同様

#### Secondary Button（セカンダリボタン）

**スタイル**:
- 背景色: 透明
- ボーダー: `1px solid var(--border-primary)`
- テキスト色: `text-primary`

#### 質問回答ボタン（特殊）

**「はい」ボタン**:
```tsx
<QuestionButton variant="yes">
  <CheckIcon />
  はい
</QuestionButton>
```

**スタイル**:
- 背景色: `student.accent-red` (#c62828)
- サイズ: `100px × 50px`
- アイコン: ✓（チェックマーク）
- 位置: 左下（逆三角形配置）

**「いいえ」ボタン**:
```tsx
<QuestionButton variant="no">
  <CrossIcon />
  いいえ
</QuestionButton>
```

**スタイル**:
- 背景色: `student.accent-blue` (#1976d2)
- サイズ: `100px × 50px`
- アイコン: ✗（バツマーク）
- 位置: 右下（逆三角形配置）

**「わからない」ボタン**:
```tsx
<QuestionButton variant="unknown">
  <QuestionIcon />
  わからない
</QuestionButton>
```

**スタイル**:
- 背景色: `student.accent-gray` (#616161)
- サイズ: `140px × 70px`
- アイコン: ?（疑問符）
- 位置: 中央上部（逆三角形配置）

**レイアウト**:
```
        [わからない]
    [はい]      [いいえ]
```

---

### 3.2 入力フィールドコンポーネント

#### Text Input（テキスト入力）

```tsx
<Input
  label="セッション名"
  placeholder="セッション名を入力"
  error={errors.title}
/>
```

**スタイル**:
- パディング: `12px 16px`
- 最小高さ: `44px`
- 背景色: `background-secondary`
- ボーダー: `1px solid border-primary`
- フォーカス時: `border-color: text-primary`、`box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2)`
- エラー時: `border-color: accent-red`

#### Slider（スライダー）

```tsx
<Slider
  min={0}
  max={4}
  value={value}
  onChange={setValue}
/>
```

**スタイル**:
- トラック: `background-color: #404040`、`height: 4px`
- サム: `background-color: #ffffff`、`width: 20px`、`height: 20px`、`border-radius: 50%`
- ホバー時: サムを拡大（`scale: 1.1`）

---

### 3.3 カードコンポーネント

#### Basic Card（基本カード）

```tsx
<Card>
  <CardHeader>タイトル</CardHeader>
  <CardContent>コンテンツ</CardContent>
</Card>
```

**生徒側スタイル**:
- 背景色: `student.bg-elevated` (#404040)
- パディング: `24px`
- シャドウ: `elevation-1`（マットな質感）

**管理者側スタイル**:
- 背景色: `admin.bg-elevated` (#ffffff)
- パディング: `16px`
- シャドウ: `elevation-1`

#### Interactive Card（インタラクティブカード）

```tsx
<Card interactive>
  <CardContent>クリック可能</CardContent>
</Card>
```

**スタイル**:
- Basic Card + ホバー効果
- ホバー時: `transform: translateY(-4px)`、`elevation-2`、`transition: all 200ms ease-in-out`

---

### 3.4 テーブルコンポーネント

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>名前</TableHead>
      <TableHead>進捗</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>学生A</TableCell>
      <TableCell>完了</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**スタイル**:
- ボーダー: `1px solid border-primary`
- 交互の行背景色: `background-secondary`と`background-primary`
- ホバー時: 行の背景色を変更（`#e3f2fd`、薄い青）
- ヘッダー: `background-color: background-secondary`、`font-weight: 600`

---

### 3.5 プログレスバーコンポーネント

```tsx
<ProgressBar value={50} max={100} />
```

**スタイル**:
- トラック: `background-color: #404040`、`height: 4px`、`border-radius: 2px`
- フィル: `background-color: #ffffff`、`height: 100%`、`border-radius: 2px`
- アニメーション: `transition: width 300ms ease-out`

---

### 3.6 アコーディオンコンポーネント

```tsx
<Accordion>
  <AccordionHeader>質問1</AccordionHeader>
  <AccordionContent>
    回答分布: はい 50%, いいえ 30%, わからない 20%
  </AccordionContent>
</Accordion>
```

**スタイル**:
- ヘッダー: `padding: 16px`、`background-color: bg-tertiary`、クリック可能
- コンテンツ: `padding: 16px`、`background-color: bg-secondary`
- アニメーション: `max-height`と`opacity`のトランジション（`duration-normal`）
- ARIA属性: `aria-expanded`、`aria-controls`

---

## 4. 生徒向け画面設計

### 4.1 Big Five診断画面

**レイアウト**:
- 全画面表示、中央配置
- 質問文: 大きなフォントサイズ（32px）、中央配置
- 質問番号: 上部に「質問 1/10」と表示
- 進捗バー: 上部にプログレスバー（10段階）
- 5段階スライダー: 0（まったくあてはまらない）〜4（完全にあてはまる）
- ナビゲーション: 「次へ」ボタン（右下）、「戻る」ボタン（左下、2問目以降）

**コンポーネント**:
```tsx
<BigFiveDiagnosisScreen>
  <ProgressBar value={currentQuestion} max={10} />
  <QuestionText>{question.text}</QuestionText>
  <Slider
    min={0}
    max={4}
    value={answer}
    onChange={setAnswer}
    labels={['まったくあてはまらない', '完全にあてはまる']}
  />
  <NavigationButtons>
    {currentQuestion > 1 && <Button variant="secondary">戻る</Button>}
    <Button variant="primary" onClick={handleNext}>次へ</Button>
  </NavigationButtons>
</BigFiveDiagnosisScreen>
```

---

### 4.2 テーマ選択画面

**レイアウト**:
- グリッド表示（2列または3列、画面サイズに応じて）
- 各カードにteaser画像を背景に配置（オーバーレイで暗く）
- カードタイトルを大きく表示（24px以上）
- ホバー時: 軽い拡大（scale: 1.02）と影の追加（光沢なし）

**コンポーネント**:
```tsx
<ThemeSelectionScreen>
  <ThemeGrid>
    {themes.map(theme => (
      <ThemeCard
        key={theme.id}
        title={theme.title}
        description={theme.description}
        image={theme.teaserImage}
        onClick={() => selectTheme(theme.id)}
      />
    ))}
  </ThemeGrid>
</ThemeSelectionScreen>
```

---

### 4.3 質問回答画面

**レイアウト**:
- 1問ずつ全画面表示
- 質問番号: 上部に「質問 1/20」と表示
- 進捗バー: 上部にプログレスバー（20段階）
- 質問文: 大きなフォントサイズ（28-32px）、中央配置または左寄せ
- 回答UI: 逆三角形配置（わからないを中央上部、はい・いいえを下部左右）

**初回ガイド**:
- 最初の3問で逆三角形UIの読み方を表示
- 以後は任意で再表示可能

**マイクロコピー**:
- 「わからない」を選んでも不利益がないこと
- 匿名であること
- 回答取り消し可否を明示

**コンポーネント**:
```tsx
<QuestionAnswerScreen>
  <ProgressBar value={currentQuestion} max={20} />
  <QuestionText>{question.text}</QuestionText>
  {showGuide && <QuestionGuide />}
  <QuestionButtons>
    <QuestionButton variant="unknown" onClick={() => handleAnswer('UNKNOWN')}>
      <QuestionIcon />
      わからない
    </QuestionButton>
    <QuestionButton variant="yes" onClick={() => handleAnswer('YES')}>
      <CheckIcon />
      はい
    </QuestionButton>
    <QuestionButton variant="no" onClick={() => handleAnswer('NO')}>
      <CrossIcon />
      いいえ
    </QuestionButton>
  </QuestionButtons>
  <SaveIndicator saved={isSaved} />
</QuestionAnswerScreen>
```

---

### 4.4 意見マッピング画面

**レイアウト**:
- 可視化エリア（80%）+ コントロールパネル（20%）
- 2D散布図（UMAP座標）
- 各点: 学生の回答位置（匿名ID表示）
- 自分の位置: 特別なマーカーでハイライト（大きめの点、アニメーション）
- クラスタ: 色分け（モノクロスケール内で濃淡）
- 対立・合意領域: 半透明オーバーレイ

**読解支援UI**:
- 凡例の表示
- クラスタ説明の表示
- ツールチップ（ホバー時の詳細情報）
- 可視化の読み方チュートリアル
- 自己位置の明示（注釈表示）
- 解釈上の注意表示（「本結果は統計的傾向であり、個人評価を目的としない」）

**コンポーネント**:
```tsx
<VisualizationScreen>
  <VisualizationArea>
    <UMAPScatterPlot
      data={mappingData}
      clusters={clusterData}
      conflictAreas={conflictAreas}
      consensusAreas={consensusAreas}
      currentStudentId={currentStudentId}
      onHover={handleHover}
      onZoom={handleZoom}
      onPan={handlePan}
    />
    <Legend />
    <InterpretationNotice />
  </VisualizationArea>
  <ControlPanel>
    <DisplayOptions>
      <Toggle label="クラスタ表示" checked={showClusters} />
      <Toggle label="対立領域" checked={showConflicts} />
      <Toggle label="合意領域" checked={showConsensus} />
    </DisplayOptions>
    <StudentInfo>
      <BigFiveRadarChart data={bigFiveResult} />
      <MainResponses responses={mainResponses} />
    </StudentInfo>
    <NearbyStudents students={nearbyStudents} />
  </ControlPanel>
</VisualizationScreen>
```

---

## 5. 管理者向け画面設計

### 5.1 ダッシュボード

**レイアウト**:
- 3カラムグリッド
- 上部: セッション情報表示（セッション名、参加者数、進捗率）
- 左カラム（40%）: 学生一覧テーブル
- 中央カラム（35%）: 進捗統計（円グラフ、棒グラフ、時系列グラフ）
- 右カラム（25%）: アクションパネル

**リアルタイム更新**:
- SSE接続で5秒ごとに更新
- 更新された項目を1秒間ハイライト
- 数値の変化アニメーション（カウントアップ）

**コンポーネント**:
```tsx
<AdminDashboard>
  <SessionHeader session={session} />
  <DashboardGrid>
    <StudentList
      students={students}
      onSelect={handleStudentSelect}
      filters={filters}
      sort={sort}
    />
    <ProgressStatistics
      completionRate={completionRate}
      bigFiveAverages={bigFiveAverages}
      responseCounts={responseCounts}
    />
    <ActionPanel
      onStartSession={handleStartSession}
      onEndSession={handleEndSession}
      onExport={handleExport}
    />
  </DashboardGrid>
</AdminDashboard>
```

---

### 5.2 結果分析画面（情報の階層整理）

**レイアウト**:
- 2カラム（可視化60% + 統計パネル40%）
- 左カラム: UMAP可視化（生徒側と同様だが、より詳細な情報表示）
- 右カラム: 統計パネル（6段階の階層構造、展開可能なセクション）

**階層構造**:
1. **レベル1：全体サマリー**（常に表示）
2. **レベル2：クラスタ分析結果**（展開可能）
3. **レベル3：質問ごとの解答分布**（展開可能、フィルター機能付き）
4. **レベル4：対立領域の詳細分析**（展開可能）
5. **レベル5：合意領域の詳細分析**（展開可能）
6. **レベル6：性格特性の分布**（展開可能）

**コンポーネント**:
```tsx
<AnalysisScreen>
  <VisualizationArea>
    <UMAPScatterPlot
      data={mappingData}
      clusters={clusterData}
      showStudentNames={true}
      onStudentSelect={handleStudentSelect}
    />
  </VisualizationArea>
  <StatisticsPanel>
    <SummarySection data={summary} />
    <Accordion title="クラスタ分析結果">
      <ClusterAnalysis clusters={clusters} />
    </Accordion>
    <Accordion title="質問ごとの解答分布">
      <QuestionDistribution
        questions={questions}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
    </Accordion>
    <Accordion title="対立領域の詳細分析">
      <ConflictAnalysis conflicts={conflicts} />
    </Accordion>
    <Accordion title="合意領域の詳細分析">
      <ConsensusAnalysis consensus={consensus} />
    </Accordion>
    <Accordion title="性格特性の分布">
      <PersonalityDistribution distributions={distributions} />
    </Accordion>
  </StatisticsPanel>
</AnalysisScreen>
```

---

## 6. レスポンシブデザイン

### 6.1 ブレークポイント

```css
/* Mobile */
@media (max-width: 767px) {
  /* 1カラムレイアウト */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1279px) {
  /* 2カラムレイアウト */
}

/* Desktop */
@media (min-width: 1280px) {
  /* 3カラムレイアウト */
}
```

### 6.2 画面別レスポンシブ対応

**質問回答画面**:
- モバイル: ボタンを縦並び（逆三角形ではなく、縦に配置）
- タブレット・デスクトップ: 逆三角形配置

**意見マッピング画面**:
- モバイル: 可視化エリアを全幅、コントロールパネルを下部に配置
- タブレット・デスクトップ: 可視化エリア80% + コントロールパネル20%

**管理者ダッシュボード**:
- モバイル: 1カラム（縦並び）、タブで切り替え
- タブレット: 2カラム
- デスクトップ: 3カラム

---

## 7. アクセシビリティ

### 7.1 キーボードナビゲーション

- Tab順序: 論理的な順序（上から下、左から右）
- ショートカットキー:
  - `Enter`: ボタンの実行、フォーム送信
  - `Esc`: モーダルの閉じる、キャンセル
  - `Arrow Keys`: 質問回答画面で前後の質問に移動（オプション）

### 7.2 スクリーンリーダー対応

- ARIA属性: `aria-label`、`aria-labelledby`、`aria-describedby`、`aria-live`
- セマンティックHTML: `<button>`、`<nav>`、`<main>`、`<article>`、`<section>`

### 7.3 色だけに依存しない情報伝達

- 質問回答画面: 色 + アイコン + テキストラベル
- チャート・グラフ: 色 + パターン + 形状

---

## 8. アニメーション・トランジション

### 8.1 ページ遷移

- フェードアウト→フェードイン: `300-500ms`
- スライド: `300ms`

### 8.2 インタラクション

- ボタンホバー: `150ms`
- ボタンクリック: `200ms`
- 質問遷移: `250ms以内`（読解優先の上限）

### 8.3 パフォーマンス最適化

- `will-change: transform, opacity`を使用
- `transform`と`opacity`のみを使用（GPU加速）
- `left`、`top`などのレイアウトプロパティは使用しない

---

## 9. 次のステップ

1. **Figmaデザインの作成**: 各画面の詳細デザイン
2. **コンポーネント実装**: Reactコンポーネントの実装
3. **Storybook設定**: コンポーネントのドキュメント化
4. **アクセシビリティテスト**: axe-core、キーボード操作、スクリーンリーダーテスト
