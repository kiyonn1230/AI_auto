'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { DEPARTMENT_COLORS, type ActivityLog, type Agent, type Department } from '@/lib/types';

type Props = {
  agent: Agent | null;
  department: Department | null;
  open: boolean;
  onClose: () => void;
};

export default function Inspector({ agent, department, open, onClose }: Props) {
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const agentId = agent?.id ?? null;

  useEffect(() => {
    if (!agentId) return;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLogs([]);
      return;
    }

    let cancelled = false;
    setLogs(null);

    void (async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, message, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(6)
        .returns<ActivityLog[]>();

      if (!cancelled) setLogs(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const deptColor = department ? DEPARTMENT_COLORS[department.key] : undefined;

  return (
    <>
      <button
        type="button"
        className={`overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="パネルを閉じる"
      />
      <aside className={`inspector ${open ? 'open' : ''}`} aria-hidden={!open}>
        <button type="button" className="inspector-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <div className="insp-label">AGENT PROFILE</div>
        <div className="insp-name">{agent?.name ?? '—'}</div>
        <div
          className="insp-dept"
          style={deptColor ? ({ '--dc': deptColor } as React.CSSProperties) : undefined}
        >
          {department ? `${department.name} CREW` : '—'}
        </div>

        <div className="insp-stats">
          <div className="insp-stat">
            <b>{agent?.tasks_today ?? '—'}</b>
            <span>TASKS TODAY</span>
          </div>
          <div className="insp-stat">
            <b>{agent ? `${Number(agent.uptime).toFixed(1)}%` : '—'}</b>
            <span>UPTIME</span>
          </div>
        </div>

        <div className="insp-label">CONNECTED TOOLS</div>
        <div className="insp-tools">
          {agent?.tools.length ? (
            agent.tools.map((tool) => (
              <span className="tag" key={tool}>
                {tool}
              </span>
            ))
          ) : (
            <span className="tag">—</span>
          )}
        </div>

        <div className="insp-log">
          {logs === null && <em>loading…</em>}
          {logs?.length === 0 && <em>アクティビティはまだありません</em>}
          {logs?.map((log) => (
            <div key={log.id}>
              <span>{new Date(log.created_at).toLocaleTimeString('ja-JP', { hour12: false })}</span>
              {log.message}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
