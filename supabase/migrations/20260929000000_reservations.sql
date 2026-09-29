-- 無料相談の予約（LP の予約フォームから受け付ける）
--
-- 氏名・メール・電話という個人情報を含むので、匿名側（anon / authenticated）には
-- INSERT だけを許し、閲覧・更新・削除はサーバー側の service_role からだけ行う。
-- 考え方は conductor_requests と同じ。

-- ---------------------------------------------------------- reservations
create table if not exists public.reservations (
  id              uuid primary key default gen_random_uuid(),
  -- 受付番号。R-YYMMDD-XXXX。XXXX は I・O・0・1 を除いた英数字（読み間違い防止）
  reception_no    text not null unique
                  check (reception_no ~ '^R-[0-9]{6}-[A-HJ-NP-Z2-9]{4}$'),
  company         text not null check (char_length(btrim(company)) between 1 and 100),
  name            text not null check (char_length(btrim(name)) between 1 and 50),
  email           text not null
                  check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tel             text not null default '' check (char_length(tel) <= 20),
  company_size    text not null
                  check (company_size in ('1〜10名', '11〜50名', '51〜100名', '101〜300名', '301名以上')),
  plan            text not null default ''
                  check (plan in ('', 'ライト', 'スタンダード', 'エンタープライズ')),
  topics          text[] not null
                  check (
                    cardinality(topics) between 1 and 7
                    and topics <@ array[
                      '問い合わせ対応', '書類処理・データ入力', 'レポート自動生成',
                      '社内ナレッジ検索', 'ツール連携・RPA', 'AI研修', 'その他'
                    ]::text[]
                  ),
  preferred_at_1  timestamptz not null,
  preferred_at_2  timestamptz,
  method          text not null
                  check (method in ('オンライン（Zoom / Google Meet）', '電話', '訪問（首都圏）')),
  detail          text not null default '' check (char_length(detail) <= 2000),
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'scheduled', 'done', 'canceled')),
  owner           text not null default '' check (char_length(owner) <= 50),
  memo            text not null default '' check (char_length(memo) <= 2000),
  source          text not null default 'LP' check (char_length(source) between 1 and 60),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reservations_created_idx
  on public.reservations (created_at desc);

create index if not exists reservations_status_idx
  on public.reservations (status, preferred_at_1);

drop trigger if exists reservations_touch_updated_at on public.reservations;
create trigger reservations_touch_updated_at
  before update on public.reservations
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------------- RLS
alter table public.reservations enable row level security;

-- 投函のみ許可。SELECT / UPDATE / DELETE のポリシーは作らない＝匿名側からは一切できない。
-- 社内用の列（status / owner / memo）は初期値のままでしか入れられない。
drop policy if exists "anyone can submit a reservation" on public.reservations;
create policy "anyone can submit a reservation"
  on public.reservations for insert to anon, authenticated
  with check (status = 'new' and owner = '' and memo = '');

-- Supabase は public スキーマの新規テーブルに anon / authenticated への全権限を自動で付けるので、
-- いったん剥がしてから、フォームが送る列への INSERT だけを付け直す。
-- RLS に加えて権限の層でも、読み取り・更新・削除と社内用の列への書き込みを塞いでおく。
revoke all on public.reservations from anon, authenticated;
grant insert (
  reception_no, company, name, email, tel, company_size, plan, topics,
  preferred_at_1, preferred_at_2, method, detail, source
) on public.reservations to anon, authenticated;

-- 個人情報を含むので Realtime の publication には載せない（載せると購読者に行が配信される）。
