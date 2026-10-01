// 予約の選択肢と型。LP のフォーム（public/lp/ の index.html・juku.html・koumuten.html）と
// マイグレーション（supabase/migrations/）の check 制約と一字一句そろえること。
// 「〜」は U+301C（WAVE DASH）。

const EMPLOYEE_SIZES = ['1〜10名', '11〜50名', '51〜100名', '101〜300名', '301名以上'] as const;

/**
 * どの LP から来た予約か。LP ごとに、規模・プラン・相談内容の選択肢が違う。
 * company_size には、学習塾・教室向けでは生徒数、それ以外では従業員数が入る。
 */
export const LP_FORMS = {
  general: {
    label: '総合',
    sizeLabel: '従業員規模',
    sizes: EMPLOYEE_SIZES,
    plans: ['', '業種別パッケージ', '個別開発'],
    topics: [
      '問い合わせ対応',
      '書類処理・データ入力',
      'レポート自動生成',
      '社内ナレッジ検索',
      'ツール連携・RPA',
      'AI研修',
      'その他',
    ],
  },
  juku: {
    label: '学習塾・教室',
    sizeLabel: '生徒数',
    sizes: ['1〜30名', '31〜60名', '61〜100名', '101名以上'],
    plans: ['', 'スモール', 'スタンダード', 'ラージ'],
    topics: ['保護者レポート', '面談の記録・準備', '問い合わせ対応', 'お便り・お知らせ作成', 'その他'],
  },
  koumuten: {
    label: '工務店・リフォーム',
    sizeLabel: '従業員規模',
    sizes: EMPLOYEE_SIZES,
    plans: ['', '事例・SNSパック', '問い合わせ対応パック', 'セットプラン'],
    topics: ['施工事例・SNS投稿', '問い合わせ対応', '工事報告書', '見積もり・提案書', 'その他'],
  },
} as const satisfies Record<
  string,
  {
    label: string;
    sizeLabel: string;
    sizes: readonly string[];
    plans: readonly string[];
    topics: readonly string[];
  }
>;

export type LpKey = keyof typeof LP_FORMS;

export const LP_KEYS = Object.keys(LP_FORMS) as LpKey[];

export function isLpKey(value: unknown): value is LpKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LP_FORMS, value);
}

/** 管理画面の表示用。知らない値（将来の LP など）はそのまま出す。 */
export function lpLabel(value: string): string {
  return isLpKey(value) ? LP_FORMS[value].label : value;
}

export function sizeLabel(value: string): string {
  return isLpKey(value) ? LP_FORMS[value].sizeLabel : '規模';
}

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
  lp: string;
  created_at: string;
  updated_at: string;
};

export const RESERVATION_COLUMNS =
  'id, reception_no, company, name, email, tel, company_size, plan, topics, preferred_at_1, preferred_at_2, method, detail, status, owner, memo, source, lp, created_at, updated_at';

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
