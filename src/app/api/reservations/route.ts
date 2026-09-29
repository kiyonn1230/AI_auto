import { NextResponse } from 'next/server';
import {
  HONEYPOT_FIELD,
  MAX_BODY_BYTES,
  generateReceptionNo,
  parseReservationInput,
} from '@/lib/reservation-input';
import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

// 受付番号が他の予約と衝突したときに振り直す回数。1日あたり約100万通りなので実際はほぼ起きない
const MAX_ATTEMPTS = 5;
const UNIQUE_VIOLATION = '23505';

function reply(status: number, body: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * LP の予約フォームの受付口。
 *
 * 書き込みには anon キーを使う。RLS で INSERT しかできない鍵なので、
 * このルートに不具合があっても他人の予約を読み出す経路にはならない。
 */
export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return reply(415, { error: '送信形式が正しくありません' });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return reply(413, { error: '入力内容が長すぎます' });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: '送信内容を読み取れませんでした' });
  }

  // ハニーポットが埋まっていたらボットとみなす。保存はせず、成功したように見せて諦めさせる
  const trap = (body as Record<string, unknown> | null)?.[HONEYPOT_FIELD];
  if (typeof trap === 'string' && trap.trim() !== '') {
    return reply(201, { receptionNo: generateReceptionNo() });
  }

  const parsed = parseReservationInput(body);
  if (!parsed.ok) {
    return reply(400, { error: parsed.message });
  }

  if (!isSupabaseConfigured()) {
    return reply(503, { error: 'ただいま予約を受け付けられません。時間をおいて再度お試しください。' });
  }

  const supabase = createServerSupabase();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const receptionNo = generateReceptionNo();
    // .select() は付けない。anon には SELECT 権限がないので、付けると挿入後の読み戻しで失敗する
    const { error } = await supabase
      .from('reservations')
      .insert({ reception_no: receptionNo, ...parsed.value });

    if (!error) {
      return reply(201, { receptionNo });
    }
    if (error.code !== UNIQUE_VIOLATION) {
      // error.details には入力値（氏名やメール）が含まれうるので、ログに残すのはコードと要旨だけ
      console.error('reservation insert failed', error.code, error.message);
      return reply(500, { error: '予約を保存できませんでした。時間をおいて再度お試しください。' });
    }
  }

  console.error('reservation insert failed: reception number collided repeatedly');
  return reply(500, { error: '予約を保存できませんでした。時間をおいて再度お試しください。' });
}
