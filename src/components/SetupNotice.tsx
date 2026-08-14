type Props = {
  kind: 'env' | 'empty' | 'query';
  reason?: string;
};

export default function SetupNotice({ kind, reason }: Props) {
  return (
    <div className="deck">
      <div className="grid-bg" />
      <div className="aura" />

      <section className="setup">
        <h1>AGENT DECK / SETUP</h1>

        {kind === 'env' && (
          <>
            <p>Supabaseの接続情報が見つかりません。次の手順でセットアップしてください。</p>
            <ol>
              <li>
                Supabaseでプロジェクトを作成し、<code>supabase/migrations</code> と{' '}
                <code>supabase/seed.sql</code> を実行する
              </li>
              <li>
                <code>.env.example</code> を <code>.env.local</code> にコピーして値を入れる
              </li>
              <li>
                <code>npm run dev</code> を再起動する
              </li>
            </ol>
            <pre>{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx`}</pre>
          </>
        )}

        {kind === 'empty' && (
          <>
            <p>
              Supabaseには接続できましたが、<code>projects</code> テーブルが空です。
              シードを流すと、元のHTMLと同じ2プロジェクトが入ります。
            </p>
            <pre>{`supabase db reset            # ローカル環境
# もしくは SQL Editor に supabase/seed.sql を貼り付けて実行`}</pre>
          </>
        )}

        {kind === 'query' && (
          <>
            <p>
              Supabaseへの問い合わせが失敗しました。マイグレーションが適用されているか、
              RLSのSELECTポリシーが有効かを確認してください。
            </p>
            <p className="reason">{reason}</p>
          </>
        )}
      </section>
    </div>
  );
}
