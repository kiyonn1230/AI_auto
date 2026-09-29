import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// service_role キーは RLS を無視して全予約を読み書きできる。
// 'server-only' により、このファイルをクライアントコンポーネントから import するとビルドが失敗する。
// 環境変数名にも NEXT_PUBLIC_ を付けないこと（付けるとブラウザ向けのバンドルに埋め込まれる）。

export function isAdminSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createAdminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が設定されていません。');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
