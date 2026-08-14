export type AgentStatus = 'online' | 'idle' | 'offline';

export type DepartmentKey = 'growth' | 'tech' | 'finance' | 'support';

export type Agent = {
  id: string;
  name: string;
  tag: string;
  tools: string[];
  status: AgentStatus;
  tasks_today: number;
  uptime: number;
  position: number;
};

export type Department = {
  id: string;
  key: DepartmentKey;
  name: string;
  position: number;
  agents: Agent[];
};

export type Project = {
  id: string;
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  conductor_sub: string;
  chat_placeholder: string;
  position: number;
  departments: Department[];
};

export type ActivityLog = {
  id: string;
  message: string;
  created_at: string;
};

export const DEPARTMENT_COLORS: Record<DepartmentKey, string> = {
  growth: '#f2b84b',
  tech: '#56c2ff',
  finance: '#3fd68c',
  support: '#ff7a85',
};
