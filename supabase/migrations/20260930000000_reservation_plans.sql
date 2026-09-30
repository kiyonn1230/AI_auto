-- 料金プランの見直し（ライト / スタンダード / エンタープライズ → ツール / 個別開発）
--
-- 旧プランはどれも個別開発（受託）の規模違いだったので、既存の予約は「個別開発」に寄せる。
-- 選択肢は LP（public/lp/index.html）と src/lib/reservations.ts の PLANS と一致させること。
-- 古い制約のままだと「個別開発」に書き換えられないので、制約を外してから更新する。

begin;

alter table public.reservations drop constraint if exists reservations_plan_check;

update public.reservations
   set plan = '個別開発'
 where plan in ('ライト', 'スタンダード', 'エンタープライズ');

alter table public.reservations
  add constraint reservations_plan_check check (plan in ('', 'ツール', '個別開発'));

commit;
