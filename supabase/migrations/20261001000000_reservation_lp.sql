-- 業種別 LP（学習塾・教室向け / 工務店・リフォーム向け）からも予約を受け付ける
--
-- どの LP から来た予約かを lp 列に持ち、規模・プラン・相談内容の選択肢を LP ごとに分ける。
-- 学習塾・教室向けでは company_size に生徒数が入る。
-- 選択肢は src/lib/reservations.ts の LP_FORMS と一字一句そろえること（「〜」は U+301C）。

begin;

alter table public.reservations
  add column if not exists lp text not null default 'general';

alter table public.reservations drop constraint if exists reservations_lp_check;
alter table public.reservations
  add constraint reservations_lp_check check (lp in ('general', 'juku', 'koumuten'));

-- 総合 LP の「ツール」プランは「業種別パッケージ」に置き換えた
alter table public.reservations drop constraint if exists reservations_plan_check;
update public.reservations set plan = '業種別パッケージ' where lp = 'general' and plan = 'ツール';

alter table public.reservations drop constraint if exists reservations_company_size_check;
alter table public.reservations drop constraint if exists reservations_topics_check;

alter table public.reservations
  add constraint reservations_company_size_check check (
    case lp
      when 'juku' then company_size in ('1〜30名', '31〜60名', '61〜100名', '101名以上')
      else company_size in ('1〜10名', '11〜50名', '51〜100名', '101〜300名', '301名以上')
    end
  );

alter table public.reservations
  add constraint reservations_plan_check check (
    case lp
      when 'general'  then plan in ('', '業種別パッケージ', '個別開発')
      when 'juku'     then plan in ('', 'スモール', 'スタンダード', 'ラージ')
      when 'koumuten' then plan in ('', '事例・SNSパック', '問い合わせ対応パック', 'セットプラン')
      else false
    end
  );

alter table public.reservations
  add constraint reservations_topics_check check (
    cardinality(topics) between 1 and 7
    and case lp
      when 'general' then topics <@ array[
        '問い合わせ対応', '書類処理・データ入力', 'レポート自動生成',
        '社内ナレッジ検索', 'ツール連携・RPA', 'AI研修', 'その他'
      ]::text[]
      when 'juku' then topics <@ array[
        '保護者レポート', '面談の記録・準備', '問い合わせ対応', 'お便り・お知らせ作成', 'その他'
      ]::text[]
      when 'koumuten' then topics <@ array[
        '施工事例・SNS投稿', '問い合わせ対応', '工事報告書', '見積もり・提案書', 'その他'
      ]::text[]
      else false
    end
  );

-- 匿名側（LP の受付）が lp 列にも書き込めるようにする。ほかの列の権限は変えない
grant insert (lp) on public.reservations to anon, authenticated;

commit;
