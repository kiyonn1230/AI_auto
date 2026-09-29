import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAdminRequest } from '@/lib/admin-guard';
import { RESERVATION_COLUMNS, type Reservation } from '@/lib/reservations';
import { createAdminSupabase, isAdminSupabaseConfigured } from '@/lib/supabase/admin';
import ReservationsAdmin from './ReservationsAdmin';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '予約リスト｜ツムギAI 管理画面',
  robots: { index: false, follow: false },
};

/** 一度に読み込む件数。検索・並び替えはブラウザ側で行うので、全件を手元に持つ。 */
const LOAD_LIMIT = 1000;

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.notice}>
          <h1>{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}

export default async function AdminReservationsPage() {
  // middleware が守っているが、設定ミスで素通りした場合でも個人情報は出さない
  if (!(await isAdminRequest())) notFound();

  if (!isAdminSupabaseConfigured()) {
    return (
      <Notice title="Supabase が未設定です">
        <p>
          <code>NEXT_PUBLIC_SUPABASE_URL</code> と <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
          を設定してから、サーバーを再起動してください。手順は <code>docs/lp/README.md</code> にあります。
        </p>
      </Notice>
    );
  }

  const { data, error } = await createAdminSupabase()
    .from('reservations')
    .select(RESERVATION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(LOAD_LIMIT);

  if (error) {
    console.error('reservation list failed', error.code, error.message);
    return (
      <Notice title="予約を読み込めませんでした">
        <p>
          マイグレーション（<code>supabase/migrations/20260929000000_reservations.sql</code>）が
          適用されているか確認してください。
        </p>
        <p className={styles.noticeCode}>{error.message}</p>
      </Notice>
    );
  }

  return (
    <ReservationsAdmin
      initialReservations={(data ?? []) as unknown as Reservation[]}
      loadLimit={LOAD_LIMIT}
    />
  );
}
