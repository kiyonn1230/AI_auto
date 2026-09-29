# テマカル — AI業務自動化サービス 立ち上げキット

中小企業向け AI業務自動化サービス「**テマカル**」のLP・予約管理・屋号の検討メモです。

| ファイル | 内容 |
| --- | --- |
| `public/lp/index.html` | ランディングページ（LP）。無料相談の予約フォーム付き |
| `public/lp/privacy.html` | プライバシーポリシー。予約フォームの同意欄とフッターからリンク |
| `public/lp/assets/` | LP の CSS / JavaScript。`store.js` が予約を受付APIへ送信する |
| `src/app/api/reservations/route.ts` | 予約の受付API。入力チェック・受付番号の発行・Supabaseへの保存 |
| `src/app/admin/reservations/` | 予約リスト（管理画面）。Basic認証つき。検索・ステータス管理・CSV出力 |
| `src/middleware.ts` | 管理画面（`/admin` 配下）の Basic 認証 |
| `supabase/migrations/20260929000000_reservations.sql` | `reservations` テーブル・RLS・権限 |
| `docs/lp/company-name.md` | 屋号「テマカル」に決めた理由・見送った候補・使い始める前のチェックリスト |
| `docs/lp/reservation-list-template.csv` | Excel / スプレッドシート用の予約リスト雛形 |
| `docs/lp/google-apps-script.gs` | 旧構成（スプレッドシート連携）のスクリプト。**現在は使っていません** |

`public/` 配下は Next.js がそのまま静的配信するため、LP のページだけを置いています。
社内向けの資料は公開されないよう `docs/lp/` に分けています。

## 予約データの流れ

```
LPの予約フォーム
   │  POST /api/reservations（JSON）
   ▼
受付API（サーバー）── 入力チェック・ハニーポット判定・受付番号の発行
   │  anon キーで INSERT のみ
   ▼
Supabase（reservations テーブル）
   ▲  service_role キーで読み書き（サーバー側のみ）
   │
管理画面 /admin/reservations ←── Basic 認証（ADMIN_USER / ADMIN_PASSWORD）
```

予約はすべて Supabase に保存されるので、どの端末・どのブラウザから管理画面を開いても同じ一覧が見えます。
以前の版はブラウザの localStorage にだけ保存していたため、他の端末の予約は見えませんでした。

## セットアップ

### 0. Supabase のプロジェクトを東京リージョンで作る

新しくプロジェクトを作るときは、Region で **Northeast Asia (Tokyo)** を選んでください。
プライバシーポリシー（`public/lp/privacy.html`）に「保存先のサーバーは日本（東京）」と書いているためです。
リージョンは後から変えられないので、別の地域で作った場合は、ポリシーの記載のほうを直してください。

### 1. テーブルを作る（マイグレーション）

`reservations` テーブルは `supabase/migrations/20260929000000_reservations.sql` で作ります。
既存のマイグレーション（`20260814000000_init.sql`）の `touch_updated_at` 関数を使うので、**必ずその後に**適用してください。

**Supabase CLI を使う場合**

```bash
supabase link --project-ref <プロジェクトのref>   # 初回のみ
supabase db push                                   # 未適用のマイグレーションをまとめて適用
```

**CLI を使わない場合（ダッシュボードの SQL Editor）**

1. Supabase のダッシュボード → SQL Editor を開く
2. まだなら `supabase/migrations/20260814000000_init.sql` の中身を貼り付けて実行
3. `supabase/migrations/20260929000000_reservations.sql` の中身を貼り付けて実行

何度流しても同じ状態になるように書いてあるので、うっかり2回実行しても壊れません。

### 2. 環境変数を設定する

`.env.example` を `.env.local` にコピーして、次の値を入れます。本番（Vercel など）では、同じ名前でホスティング側の環境変数に登録します。

| 変数 | どこで使うか | 取得場所 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 受付API・管理画面 | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 受付API（書き込み専用の鍵として） | 同 → Project API keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理画面（サーバー側のみ） | 同 → Project API keys → `service_role` `secret` |
| `ADMIN_USER` | 管理画面のログインID | 自分で決める |
| `ADMIN_PASSWORD` | 管理画面のパスワード | 自分で決める（例：`openssl rand -base64 24`） |

- `SUPABASE_SERVICE_ROLE_KEY` は **RLS を無視して全予約を読み書きできる鍵**です。`NEXT_PUBLIC_` を付けたり、LP の JavaScript に書いたりしないでください。
- `ADMIN_USER` と `ADMIN_PASSWORD` のどちらかが空のあいだは、管理画面は開けません（「設定されていません」と表示されます）。
- `NEXT_PUBLIC_` の付いた値はビルド時に埋め込まれるので、変更したら再ビルド（再デプロイ）が必要です。
  `SUPABASE_SERVICE_ROLE_KEY` と `ADMIN_*` は起動時に読むので、設定を変えたらサーバーの再起動だけで反映されます。

### 3. 起動して確認する

```bash
npm install
npm run dev
# → http://localhost:3000/lp/index.html          （LP）
# → http://localhost:3000/admin/reservations     （予約リスト。ID・パスワードを聞かれます）
```

Next.js の `public/` はディレクトリの `index.html` を自動で返さないため、LP の URL には `index.html` まで含めてください。

確認の手順:

1. LP のフォームから予約を送信し、完了画面に受付番号（`R-YYMMDD-XXXX`）が出ることを確認
2. 管理画面を開き、その受付番号の予約が一覧に出ることを確認
3. 別の端末（スマートフォンなど）からも管理画面を開き、同じ一覧が見えることを確認

## 管理画面でできること

- 予約の一覧表示（新しい順に最大1000件を読み込み）
- 受付番号・会社名・氏名・メール・内容での検索、ステータスでの絞り込み、並び替え
- ステータス（新規 / 連絡済 / 日程確定 / 面談完了 / キャンセル）・担当・社内メモの変更（変更するとすぐ保存）
- 予約の削除（確認ダイアログあり。元に戻せません）
- 表示中の予約の CSV 出力（Excel で文字化けしない BOM 付き UTF-8）
- 「再読み込み」で最新の一覧を取得

お客様が入力した内容（会社名・連絡先・希望日時など）は、管理画面からは書き換えられません。

## 流入元の記録

LP の URL に `utm_source` を付けておくと、どこから来た予約かが「流入元」として記録されます。

```
https://<ドメイン>/lp/index.html?utm_source=instagram   → 流入元「LP:instagram」
https://<ドメイン>/lp/index.html                        → 流入元「LP」
```

広告・SNS・チラシの QR コードごとに値を変えておくと、どの経路から予約が来ているかが管理画面と CSV で分かります。

## セキュリティの設計

予約には氏名・メールアドレス・電話番号が含まれるため、次のように守っています。

**データベース（Supabase）**

- 匿名ユーザー（`anon` キー）ができるのは**予約の投函だけ**。一覧の取得・更新・削除はできません
- 匿名ユーザーは、ステータス・担当・社内メモ・作成日時などの社内用の列には書き込めません
- RLS のポリシーに加えて、列単位の権限でも同じ制限をかけています（二重の防御）
- 形式・文字数・選択肢は check 制約でも検証しています（受付APIを通らずに書き込まれた場合の最後の砦）
- 個人情報を含むので、Realtime での配信対象にはしていません

**受付API**

- 入力はすべてサーバー側で検証します（ブラウザ側のチェックは迂回できるため）
- 画面に見えない入力欄（ハニーポット）が埋まっている送信はボットとみなし、保存せずに成功を装います
- 文字数の上限を設け、16KB を超える送信は受け付けません
- 書き込みには `anon` キーを使います。このAPIに不具合があっても、他人の予約を読み出す経路にはなりません
- エラーのログには、氏名やメールなどの入力値を残しません

**管理画面**

- `/admin` 配下はすべて Basic 認証で保護しています
- 画面の表示と、変更・削除の処理（Server Action）の中でも、もう一度認証を確かめています。
  middleware の設定を誤って保護が外れた場合でも、個人情報は表示されず、変更・削除もできません
- `service_role` キーを使うコードには `server-only` を付けてあり、ブラウザ向けのコードから読み込むとビルドが失敗します
- 検索エンジンに載らないよう `noindex` を指定しています
- CSV 出力では、`=` `+` `-` `@` で始まる値の先頭に `'` を付けています。
  フォームに数式を仕込まれても、Excel で開いたときに実行されないようにするためです

**運用上の注意**

- Basic 認証は通信が暗号化されていないと ID・パスワードが盗み見られます。**必ず HTTPS で公開してください**（Vercel なら標準で HTTPS です）
- 複数人で管理画面を使うようになったら、共有パスワードの Basic 認証から Supabase Auth（担当者ごとのログイン）への移行を検討してください
- 受付APIには回数制限（レート制限）はありません。ハニーポットで大半の自動送信は防げますが、
  狙い撃ちの連続送信が来た場合は、Vercel の Firewall や Cloudflare などで制限をかけてください
- `anon` キーはブラウザに公開される前提の鍵のため、受付APIを通らずに Supabase へ直接投函することは技術的に可能です。
  その場合もハニーポットは効きませんが、check 制約と列の権限により、形式の正しい予約しか入らず、社内用の列も書き換えられません。
  完全に受付APIだけに絞りたい場合は、`anon` の INSERT 権限を外し、受付APIを `service_role` で書き込む構成に変えられます

## 公開前にやること

- [ ] 屋号「テマカル」の商標を J-PlatPat で確認し、ドメインを取得（`docs/lp/company-name.md`）
- [x] 連絡先のメールアドレスを設定（`temakaru48@gmail.com`）。変える場合は `public/lp/index.html` のフッターと `public/lp/privacy.html` の3か所を直す
- [ ] 料金・導入イメージの数値を実態に合わせて調整
- [ ] プライバシーポリシー（`public/lp/privacy.html`）の内容が実際の運用と合っているか確認し、制定日を公開日に合わせる。
      外部サービスや保存先、アクセス解析ツールを追加・変更したら、このページも直す
- [ ] Supabase にマイグレーションを適用し、環境変数を設定（上の「セットアップ」）
- [ ] 本番の URL で LP から予約を1件送り、管理画面に出ることを確認してから削除
