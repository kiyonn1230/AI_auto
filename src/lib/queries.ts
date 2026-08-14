import { createServerSupabase, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Project } from '@/lib/types';

const PROJECT_SELECT = `
  id,
  slug,
  label,
  eyebrow,
  title,
  subtitle,
  conductor_sub,
  chat_placeholder,
  position,
  departments (
    id,
    key,
    name,
    position,
    agents (
      id,
      name,
      tag,
      tools,
      status,
      tasks_today,
      uptime,
      position
    )
  )
`;

export type ProjectsResult = { projects: Project[]; error: string | null };

/**
 * ダッシュボード1画面ぶんのデータを1リクエストで取得する。
 * 件数が小さいので入れ子の並び替えはクライアント側（JS）で行う。
 */
export async function fetchProjects(): Promise<ProjectsResult> {
  if (!isSupabaseConfigured()) {
    return { projects: [], error: 'NOT_CONFIGURED' };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .order('position', { ascending: true })
    .returns<Project[]>();

  if (error) {
    return { projects: [], error: error.message };
  }

  const projects = (data ?? []).map((project) => ({
    ...project,
    departments: [...project.departments]
      .sort((a, b) => a.position - b.position)
      .map((department) => ({
        ...department,
        agents: [...department.agents].sort((a, b) => a.position - b.position),
      })),
  }));

  return { projects, error: null };
}
