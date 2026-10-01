import { LIMITS, LP_FORMS, METHODS, isLpKey, type LpKey } from '@/lib/reservations';

/** 画面には出さない入力欄。人は空のまま送り、フォームを総なめするボットは埋めてくる。 */
export const HONEYPOT_FIELD = 'website';

/** 受け付けるリクエスト本文の上限。最長の入力をすべて埋めても 16KB には届かない。 */
export const MAX_BODY_BYTES = 16 * 1024;

/** 希望日時として受け付ける範囲。 */
const PAST_TOLERANCE_MS = 10 * 60 * 1000;
const FUTURE_LIMIT_MS = 366 * 24 * 60 * 60 * 1000;

export type ReservationInsert = {
  company: string;
  name: string;
  email: string;
  tel: string;
  company_size: string;
  plan: string;
  topics: string[];
  preferred_at_1: string;
  preferred_at_2: string | null;
  method: string;
  detail: string;
  source: string;
  lp: LpKey;
};

export type ParseResult = { ok: true; value: ReservationInsert } | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_PATTERN = /^[0-9+\-() ]*$/;
const SOURCE_PATTERN = /^[\w.:\-]{1,60}$/;
const DASHES = /[‐‑‒–—―−ー－]/g;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function oneOf<T extends readonly string[]>(list: T, value: string): value is T[number] {
  return (list as readonly string[]).includes(value);
}

function parseFutureDate(value: unknown, now: number): string | null {
  const raw = str(value);
  if (!raw) return null;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return null;
  if (time < now - PAST_TOLERANCE_MS || time > now + FUTURE_LIMIT_MS) return null;
  return new Date(time).toISOString();
}

/**
 * LP から届いた JSON を検証し、保存できる形に整える。
 * ブラウザ側のチェックは迂回できるので、ここを正とする（DB の check 制約は最後の砦）。
 */
export function parseReservationInput(body: unknown, now = Date.now()): ParseResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: '送信内容を読み取れませんでした' };
  }
  const input = body as Record<string, unknown>;

  // どの LP のフォームか。古い LP の JavaScript がキャッシュに残っていても受け付けられるよう、
  // 指定がなければ総合 LP として扱う
  const rawLp = str(input.lp);
  const lp: LpKey | null = rawLp === '' ? 'general' : isLpKey(rawLp) ? rawLp : null;
  if (!lp) {
    return { ok: false, message: '送信元のページが正しくありません' };
  }
  const options = LP_FORMS[lp];

  const company = str(input.company);
  if (!company || company.length > LIMITS.company) {
    return { ok: false, message: `会社名・教室名を入力してください（${LIMITS.company}文字以内）` };
  }

  const name = str(input.name);
  if (!name || name.length > LIMITS.name) {
    return { ok: false, message: `お名前を入力してください（${LIMITS.name}文字以内）` };
  }

  const email = str(input.email);
  if (!EMAIL_PATTERN.test(email) || email.length > LIMITS.email) {
    return { ok: false, message: 'メールアドレスの形式が正しくありません' };
  }

  // 全角数字や全角ハイフンで入力されても受け付けられるよう、半角にそろえてから確かめる
  const tel = str(input.tel).normalize('NFKC').replace(DASHES, '-');
  if (tel.length > LIMITS.tel || !TEL_PATTERN.test(tel)) {
    return { ok: false, message: `電話番号は数字とハイフンで入力してください（${LIMITS.tel}文字以内）` };
  }

  const companySize = str(input.size);
  if (!oneOf(options.sizes, companySize)) {
    return { ok: false, message: `${options.sizeLabel}を選択してください` };
  }

  const plan = str(input.plan);
  if (!oneOf(options.plans, plan)) {
    return { ok: false, message: 'プランの指定が正しくありません' };
  }

  const rawTopics = Array.isArray(input.topics) ? input.topics : [];
  const topics = [...new Set(rawTopics.map(str))];
  if (topics.length === 0) {
    return { ok: false, message: 'ご相談内容を1つ以上選択してください' };
  }
  if (!topics.every((topic) => oneOf(options.topics, topic))) {
    return { ok: false, message: 'ご相談内容の指定が正しくありません' };
  }

  const preferredAt1 = parseFutureDate(input.date1, now);
  if (!preferredAt1) {
    return { ok: false, message: '第1希望日時を、これから1年以内の日時で選択してください' };
  }

  const hasDate2 = str(input.date2) !== '';
  const preferredAt2 = hasDate2 ? parseFutureDate(input.date2, now) : null;
  if (hasDate2 && !preferredAt2) {
    return { ok: false, message: '第2希望日時を、これから1年以内の日時で選択してください' };
  }

  const method = str(input.method);
  if (!oneOf(METHODS, method)) {
    return { ok: false, message: '相談方法を選択してください' };
  }

  const detail = str(input.detail);
  if (detail.length > LIMITS.detail) {
    return { ok: false, message: `ご相談の詳細は${LIMITS.detail}文字以内で入力してください` };
  }

  if (input.agree !== true) {
    return { ok: false, message: 'プライバシーポリシーへの同意が必要です' };
  }

  // 流入元は集計に使うだけなので、形式が合わなければ弾かずに既定値へ寄せる
  const rawSource = str(input.source);
  const source = SOURCE_PATTERN.test(rawSource) ? rawSource : 'LP';

  return {
    ok: true,
    value: {
      company,
      name,
      email,
      tel,
      company_size: companySize,
      plan,
      topics,
      preferred_at_1: preferredAt1,
      preferred_at_2: preferredAt2,
      method,
      detail,
      source,
      lp,
    },
  };
}

// I・O・0・1 は読み間違えやすいので除く。32文字なので 1 バイトの剰余に偏りが出ない
const RECEPTION_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const tokyoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 受付番号 R-YYMMDD-XXXX。
 * 日付は日本時間で作る（UTC だと朝9時前の予約が前日の番号になる）。
 */
export function generateReceptionNo(now = new Date()): string {
  const parts = Object.fromEntries(
    tokyoDate.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (byte) => RECEPTION_ALPHABET[byte % 32]).join('');
  return `R-${parts.year}${parts.month}${parts.day}-${suffix}`;
}
