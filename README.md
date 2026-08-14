# AGENT DECK

Conductor（統括エージェント）と各部門のAIエージェントの稼働状況を1画面で見るダッシュボード。
もともと単一の `index.html` にハードコードされていたモックを、**Next.js (App Router) + Supabase** に移植したもの。

デザイン・配色・アニメーション（背景グリッド、オーラ、Conductorから各部門へ伸びるベジェ曲線）は元のHTMLをそのまま維持し、
データだけをSupabaseに移している。

## 構成

```
src/
  app/
    layout.tsx        フォント（next/font で自前ホスト）とメタデータ
    page.tsx          Server Component。Supabaseから1クエリで全プロジェクトを取得
    actions.ts        Server Action。Conductorへの依頼を conductor_requests に積む
    globals.css       元 index.html の <style> をそのまま移植
  components/
    Deck.tsx          画面本体（タブ切替・部門の開閉・コネクタ描画・Realtime購読）
    Inspector.tsx     エージェント詳細パネル。activity_logs をブラウザから取得
    ConductorChat.tsx 依頼フォーム
    Clock.tsx         右上の時計（ハイドレーション差分を避けるためクライアントで開始）
    SetupNotice.tsx   未設定・データ空・クエリ失敗時の案内
  lib/
    queries.ts        projects → departments → agents の入れ子取得
    types.ts          共通の型と部門カラー
    supabase/         サーバー用 / ブラウザ用クライアント
supabase/
  migrations/         スキーマ・RLS・Realtime設定
  seed.sql            元のHTMLに入っていた2プロジェクトぶんの初期データ
index.html            移植元の静的モック（デザインの参照用に残してある）
```

## データモデル

| テーブル | 役割 |
| --- | --- |
| `projects` | 画面上部のプロジェクトタブ1つ = 1行。見出し・サブコピー・入力欄のプレースホルダも保持 |
| `departments` | プロジェクトごとの部門。`key` が `growth` / `tech` / `finance` / `support` で配色が決まる |
| `agents` | 部門所属のエージェント。`status`・`tools`・`tasks_today`・`uptime` を持つ |
| `activity_logs` | インスペクタ下部に出す稼働ログ |
| `conductor_requests` | Conductorの入力欄から投函された依頼のキュー（`queued` → `running` → `done`） |

元のHTMLではランダム値だった「TASKS TODAY」「UPTIME」は、`agents` の実データの合計・平均を表示するようにした。

### RLS

- `projects` / `departments` / `agents` / `activity_logs` … `anon` と `authenticated` に **SELECT のみ** 許可
- `conductor_requests` … **INSERT のみ** 許可（読み出しは service role のワーカー用に閉じてある）

現状は「誰でも閲覧できる公開ダッシュボード」の前提。ログイン制にする場合は `projects` に `owner_id` を足し、
各ポリシーの `using (true)` を `auth.uid()` ベースの条件に差し替える。

## セットアップ

1. 依存関係のインストール

   ```bash
   npm install
   ```

2. Supabaseプロジェクトを用意し、SQLを流す

   ```bash
   # Supabase CLI を使う場合
   supabase db reset          # migrations + seed.sql が適用される

   # ホスト版を使う場合は SQL Editor に以下の順で貼り付けて実行
   #   1. supabase/migrations/20260814000000_init.sql
   #   2. supabase/seed.sql
   ```

3. 環境変数

   ```bash
   cp .env.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を Settings → API から転記
   ```

4. 起動

   ```bash
   npm run dev     # http://localhost:3000
   ```

環境変数が未設定・データが空・クエリ失敗のときは、真っ白ではなく原因と手順を出す画面に切り替わる。

## 動きの確認ポイント

- プロジェクトタブの切り替えで、見出し・Conductor・部門構成がまるごと入れ替わる
- 部門ヘッダのクリックで折りたたみ、Conductorからのコネクタが引き直される
- エージェント行のクリックで右のインスペクタが開き、`activity_logs` を取得して表示（Escで閉じる）
- `agents` テーブルの UPDATE は Realtime でそのまま画面に反映される（`supabase_realtime` パブリケーションに登録済み）

## この先の実装

- `conductor_requests` を拾って実際にエージェントを動かすワーカー（Edge Function / cron）
- Supabase Auth を入れてプロジェクトをユーザーごとに閉じる
- 「＋ 追加」ボタンからのプロジェクト作成フォーム（現状はタブの見た目のみ）
