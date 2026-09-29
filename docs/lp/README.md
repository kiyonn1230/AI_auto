# ツムギAI — AI業務自動化サービス 立ち上げキット

中小企業向け AI業務自動化サービス「**ツムギAI**」のLP・予約リスト・社名案です。

| ファイル | 内容 |
| --- | --- |
| `public/lp/index.html` | ランディングページ（LP）。無料相談の予約フォーム付き |
| `public/lp/reservations.html` | 予約リスト（管理画面）。検索・ステータス管理・CSV出力 |
| `public/lp/assets/` | LP・予約リスト共通の CSS / JavaScript |
| `docs/lp/company-name.md` | 社名案・タグライン・登記前チェックリスト |
| `docs/lp/reservation-list-template.csv` | Excel / スプレッドシート用の予約リスト雛形 |
| `docs/lp/google-apps-script.gs` | 予約をGoogleスプレッドシートに自動記録するスクリプト |

`public/` 配下は Next.js がそのまま静的配信するため、ページだけを置いています。
社内向けの資料は公開されないよう `docs/lp/` に分けています。

## 確認方法

```bash
npm install
npm run dev
# → http://localhost:3000/lp/index.html          （LP）
# → http://localhost:3000/lp/reservations.html   （予約リスト）
```

Next.js の `public/` はディレクトリの `index.html` を自動で返さないため、URLには `index.html` まで含めてください。

## 予約データの流れ

```
LPの予約フォーム ──▶ ブラウザ(localStorage) ──▶ reservations.html で閲覧・管理
        │
        └─(endpoint設定時)──▶ Google Apps Script ──▶ スプレッドシート「予約リスト」＋メール通知
```

- **初期状態（デモ）**：予約はそのブラウザ内にだけ保存されます。社内での動作確認向けです。
  `reservations.html` は閲覧者自身のブラウザ内のデータしか表示しないため、公開されていても他人の予約は見えません。
- **本番運用**：`docs/lp/google-apps-script.gs` の手順どおりにウェブアプリをデプロイし、
  発行されたURLを `public/lp/assets/js/store.js` の `CONFIG.endpoint` に設定してください。
  すべての予約がスプレッドシートに集まり、新着時にメール通知が届きます。

## 公開前にやること

- [ ] 社名を決定し、商標・商号・ドメインを確認（`docs/lp/company-name.md`）
- [ ] フッターの住所・メールアドレスを差し替え（`public/lp/index.html`）
- [ ] 料金・導入イメージの数値を実態に合わせて調整
- [ ] プライバシーポリシーページを作成し、フォームのリンク先を設定
- [ ] 予約の受信先を設定（Google Apps Script、またはこのリポジトリの Supabase）
