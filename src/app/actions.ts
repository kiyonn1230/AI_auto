'use server';

import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase/server';

export type ConductorResult = { ok: boolean; message: string };

/**
 * Conductor の入力欄からの依頼を conductor_requests に積む。
 * 実行そのものは別のワーカー（Edge Function など）が status を進める前提。
 */
export async function queueConductorRequest(
  projectId: string,
  message: string,
): Promise<ConductorResult> {
  const text = message.trim();

  if (!text) {
    return { ok: false, message: '依頼内容を入力してください' };
  }
  if (text.length > 2000) {
    return { ok: false, message: '依頼は2000文字以内で入力してください' };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabaseが未設定のため送信できません' };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('conductor_requests')
    .insert({ project_id: projectId, message: text });

  if (error) {
    return { ok: false, message: `送信に失敗しました: ${error.message}` };
  }

  return { ok: true, message: 'Conductorのキューに追加しました' };
}
