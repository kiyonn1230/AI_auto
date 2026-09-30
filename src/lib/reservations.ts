// 予約の選択肢と型。LP のフォーム（public/lp/index.html）と
// マイグレーション（supabase/migrations/20260929000000_reservations.sql）の
// check 制約と一字一句そろえること。「〜」は U+301C（WAVE DASH）。

export const COMPANY_SIZES = ['1〜10名', '11〜50名', '51〜100名', '101〜300名', '301名以上'] as const;

export const PLANS = ['', 'ツール', '個別開発'] as const;

export const TOPICS = [
  '問い合わせ対応',
  '書類処理・データ入力',
  'レポート自動生成',
  '社内ナレッジ検索',
  'ツール連携・RPA',
  'AI研修',
  'その他',
] as const;

export const METHODS = ['オンライン（Zoom / Google Meet）', '電話', '訪問（首都圏）'] as const;

export const STATUSES = [
  { value: 'new', label: '新規' },
  { value: 'contacted', label: '連絡済' },
  { value: 'scheduled', label: '日程確定' },
  { value: 'done', label: '面談完了' },
  { value: 'canceled', label: 'キャンセル' },
] as const;

export type ReservationStatus = (typeof STATUSES)[number]['value'];

export const LIMITS = {
  company: 100,
  name: 50,
  email: 254,
  tel: 20,
  detail: 2000,
  owner: 50,
  memo: 2000,
  source: 60,
} as const;

export type Reservation = {
  id: string;
  reception_no: string;
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
  status: ReservationStatus;
  owner: string;
  memo: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export const RESERVATION_COLUMNS =
  'id, reception_no, company, name, email, tel, company_size, plan, topics, preferred_at_1, preferred_at_2, method, detail, status, owner, memo, source, created_at, updated_at';

export function isStatus(value: unknown): value is ReservationStatus {
  return STATUSES.some((status) => status.value === value);
}

export function statusLabel(value: string): string {
  return STATUSES.find((status) => status.value === value)?.label ?? value;
}

const tokyoFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * 日本時間の「YYYY-MM-DD HH:mm」。
 * サーバー（UTC で動くことが多い）とブラウザで表示がずれないよう、タイムゾーンを固定している。
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  const parts = Object.fromEntries(
    tokyoFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}
