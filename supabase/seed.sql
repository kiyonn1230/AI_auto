-- AGENT DECK — 初期データ（元の index.html にハードコードされていた PROJECTS を移植）
-- 何度流しても同じ状態になるように on conflict / not exists で守っている。

-- ---------------------------------------------------------------- projects
insert into public.projects
  (slug, label, eyebrow, title, subtitle, conductor_sub, chat_placeholder, position)
values
  (
    'osakafinds',
    'OsakaFinds',
    'Command Deck / E-commerce',
    'あなたのAI社員たちを、ひと目で。',
    'Shopee Singaporeでのドロップシッピング運営を、Conductorと4部門のエージェントが分担します。',
    'Orchestration Core · OsakaFinds',
    'OsakaFindsのタスクをConductorに依頼する…',
    0
  ),
  (
    'saas',
    'サンプル：SaaSプロダクト',
    'Command Deck / Template',
    '別プロジェクトは、別の部門構成で。',
    'プロジェクトを切り替えると、Conductorと部門ごとまるごと入れ替わります。これはテンプレート例です。',
    'Orchestration Core · Sample SaaS',
    'このプロジェクトのタスクをConductorに依頼する…',
    1
  )
on conflict (slug) do nothing;

-- ------------------------------------------------------------ departments
insert into public.departments (project_id, key, name, position)
select p.id, d.key, d.name, d.position
from public.projects p
join (
  values
    ('osakafinds', 'growth',  'GROWTH',  0),
    ('osakafinds', 'tech',    'TECH',    1),
    ('osakafinds', 'finance', 'FINANCE', 2),
    ('osakafinds', 'support', 'SUPPORT', 3),
    ('saas',       'growth',  'GROWTH',  0),
    ('saas',       'tech',    'PRODUCT', 1),
    ('saas',       'finance', 'FINANCE', 2),
    ('saas',       'support', 'SUPPORT', 3)
) as d(project_slug, key, name, position) on d.project_slug = p.slug
on conflict (project_id, key) do nothing;

-- ----------------------------------------------------------------- agents
insert into public.agents
  (department_id, name, tag, tools, status, tasks_today, uptime, position)
select d.id, a.name, a.tag, a.tools, a.status::agent_status, a.tasks_today, a.uptime, a.position
from public.departments d
join public.projects p on p.id = d.project_id
join (
  values
    -- OsakaFinds / GROWTH
    ('osakafinds', 'growth',  'Listing Agent',              'Shopee',   array['Shopee', 'SEO'],      'online', 34, 99.4, 0),
    ('osakafinds', 'growth',  'Ad Optimizer',               'Ads',      array['Meta Ads', 'Budget'], 'online', 21, 99.1, 1),
    ('osakafinds', 'growth',  'SEO Agent',                  'SEO',      array['Keywords'],           'idle',    6, 97.8, 2),
    ('osakafinds', 'growth',  'Content Agent',              'Content',  array['Canva', 'Copy'],      'online', 18, 98.9, 3),
    ('osakafinds', 'growth',  'Inventory / Pricing Agent',  'Repricing',array['Stock', 'Repricing'], 'online', 42, 99.6, 4),
    -- OsakaFinds / TECH
    ('osakafinds', 'tech',    'Infra Monitor',              'Infra',    array['Vercel', 'Uptime'],   'online', 12, 99.9, 0),
    ('osakafinds', 'tech',    'Deploy Bot',                 'CI/CD',    array['GitHub', 'CI'],       'online',  9, 99.5, 1),
    ('osakafinds', 'tech',    'Data Pipeline',              'DB',       array['Supabase'],           'online', 27, 99.7, 2),
    ('osakafinds', 'tech',    'QA Agent',                   'QA',       array['Tests'],              'idle',    4, 98.2, 3),
    -- OsakaFinds / FINANCE
    ('osakafinds', 'finance', 'Ledger Agent',               'Stripe',   array['Stripe'],             'online', 16, 99.8, 0),
    ('osakafinds', 'finance', 'Invoice Bot',                'Invoices', array['PayPal'],             'online', 11, 99.3, 1),
    ('osakafinds', 'finance', 'Forecast Agent',             'Forecast', array['Cash Flow'],          'idle',    3, 97.5, 2),
    ('osakafinds', 'finance', 'Margin Tracker',             'Margin',   array['Revenue', 'Margin'],  'online', 14, 99.0, 3),
    -- OsakaFinds / SUPPORT
    ('osakafinds', 'support', 'Inbox Agent',                'Email',    array['Gmail'],              'online', 38, 99.6, 0),
    ('osakafinds', 'support', 'Refund Bot',                 'Refunds',  array['PayPal'],             'online',  7, 99.2, 1),
    ('osakafinds', 'support', 'FAQ Agent',                  'Chat',     array['Chat'],               'online', 25, 99.4, 2),
    ('osakafinds', 'support', 'Buyer Inquiry Agent',        'Shopee',   array['Shopee Chat'],        'online', 31, 99.1, 3),
    -- Sample SaaS / GROWTH
    ('saas',       'growth',  'Landing Page Agent',         'SEO',      array['SEO'],                'online', 12, 99.0, 0),
    ('saas',       'growth',  'SNS Agent',                  'X',        array['X / Twitter'],        'idle',    5, 98.4, 1),
    -- Sample SaaS / PRODUCT
    ('saas',       'tech',    'Feature Agent',              'Roadmap',  array['Roadmap'],            'online',  8, 99.2, 0),
    ('saas',       'tech',    'Bug Triage Agent',           'GitHub',   array['GitHub'],             'online', 17, 99.5, 1),
    ('saas',       'tech',    'QA Agent',                   'Tests',    array['Tests'],              'idle',    3, 97.9, 2),
    -- Sample SaaS / FINANCE
    ('saas',       'finance', 'Billing Agent',              'Stripe',   array['Stripe'],             'online', 10, 99.7, 0),
    ('saas',       'finance', 'MRR Tracker',                'MRR',      array['MRR'],                'online',  6, 99.3, 1),
    -- Sample SaaS / SUPPORT
    ('saas',       'support', 'Inbox Agent',                'Email',    array['Gmail'],              'online', 22, 99.5, 0),
    ('saas',       'support', 'Onboarding Agent',           'Docs',     array['Docs'],               'online',  9, 99.1, 1)
) as a(project_slug, dept_key, name, tag, tools, status, tasks_today, uptime, position)
  on a.project_slug = p.slug and a.dept_key = d.key
on conflict (department_id, name) do nothing;

-- ---------------------------------------------------------- activity_logs
-- 元の HTML では「2分前 / 14分前 / 41分前」の3行をその場で生成していた。
insert into public.activity_logs (agent_id, message, created_at)
select a.id, m.message, now() - (m.mins || ' minutes')::interval
from public.agents a
cross join (
  values
    ('task completed', 2),
    ('routed by Conductor', 41)
) as m(message, mins)
where not exists (
  select 1 from public.activity_logs l where l.agent_id = a.id
);

insert into public.activity_logs (agent_id, message, created_at)
select a.id,
       'synced with ' || coalesce(a.tools[1], 'system'),
       now() - interval '14 minutes'
from public.agents a
where not exists (
  select 1
  from public.activity_logs l
  where l.agent_id = a.id and l.message like 'synced with %'
);
