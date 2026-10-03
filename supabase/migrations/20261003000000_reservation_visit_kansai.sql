-- 相談方法の訪問エリアを「首都圏」から「関西」に変更
-- 選択肢は src/lib/reservations.ts の METHODS と各LPのフォームにそろえること。

begin;

alter table public.reservations drop constraint if exists reservations_method_check;

update public.reservations set method = '訪問（関西）' where method = '訪問（首都圏）';

alter table public.reservations
  add constraint reservations_method_check
  check (method in ('オンライン（Zoom / Google Meet）', '電話', '訪問（関西）'));

commit;
