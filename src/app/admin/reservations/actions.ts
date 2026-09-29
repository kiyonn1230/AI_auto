'use server';

import { isAdminRequest } from '@/lib/admin-guard';
import { LIMITS, RESERVATION_COLUMNS, isStatus, type Reservation } from '@/lib/reservations';
import { createAdminSupabase, isAdminSupabaseConfigured } from '@/lib/supabase/admin';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** 管理画面から変更できるのはこの3項目だけ。お客様が入力した内容は書き換えさせない。 */
export type ReservationPatch = { status?: string; owner?: string; memo?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function denyReason(): Promise<string | null> {
  if (!(await isAdminRequest())) return '認証が必要です。ページを再読み込みしてください。';
  if (!isAdminSupabaseConfigured()) return 'Supabase の接続情報が設定されていません。';
  return null;
}

function buildChanges(patch: ReservationPatch): { changes: Record<string, string> } | { message: string } {
  const changes: Record<string, string> = {};

  if (patch.status !== undefined) {
    if (!isStatus(patch.status)) return { message: 'ステータスの指定が正しくありません' };
    changes.status = patch.status;
  }
  if (patch.owner !== undefined) {
    const owner = String(patch.owner).trim();
    if (owner.length > LIMITS.owner) return { message: `担当は${LIMITS.owner}文字以内で入力してください` };
    changes.owner = owner;
  }
  if (patch.memo !== undefined) {
    const memo = String(patch.memo).trim();
    if (memo.length > LIMITS.memo) return { message: `社内メモは${LIMITS.memo}文字以内で入力してください` };
    changes.memo = memo;
  }

  if (Object.keys(changes).length === 0) return { message: '変更する項目がありません' };
  return { changes };
}

export async function updateReservation(
  id: string,
  patch: ReservationPatch,
): Promise<ActionResult<Reservation>> {
  const denied = await denyReason();
  if (denied) return { ok: false, message: denied };
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    return { ok: false, message: '対象の予約が見つかりません' };
  }

  const built = buildChanges(patch ?? {});
  if ('message' in built) return { ok: false, message: built.message };

  const { data, error } = await createAdminSupabase()
    .from('reservations')
    .update(built.changes)
    .eq('id', id)
    .select(RESERVATION_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('reservation update failed', error.code, error.message);
    return { ok: false, message: '保存できませんでした。時間をおいて再度お試しください。' };
  }
  if (!data) {
    return { ok: false, message: 'この予約は見つかりません（削除された可能性があります）' };
  }
  return { ok: true, data: data as unknown as Reservation };
}

export async function deleteReservation(id: string): Promise<ActionResult<null>> {
  const denied = await denyReason();
  if (denied) return { ok: false, message: denied };
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    return { ok: false, message: '対象の予約が見つかりません' };
  }

  const { error, count } = await createAdminSupabase()
    .from('reservations')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    console.error('reservation delete failed', error.code, error.message);
    return { ok: false, message: '削除できませんでした。時間をおいて再度お試しください。' };
  }
  if (!count) {
    return { ok: false, message: 'この予約は見つかりません（すでに削除された可能性があります）' };
  }
  return { ok: true, data: null };
}
