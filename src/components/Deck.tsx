'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Clock from './Clock';
import ConductorChat from './ConductorChat';
import Inspector from './Inspector';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Agent, AgentStatus, Department, Project } from '@/lib/types';

type Selection = { agentId: string; departmentId: string };

export default function Deck({ projects: initialProjects }: { projects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [currentProjectId, setCurrentProjectId] = useState(initialProjects[0].id);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selection, setSelection] = useState<Selection | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const project = useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? projects[0],
    [projects, currentProjectId],
  );

  /* ---------------- realtime: エージェントの状態変化を反映 ---------------- */
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('agent-deck-agents')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'agents' },
        (payload) => {
          const next = payload.new as Partial<Agent> & { id?: string };
          if (!next?.id) return;

          setProjects((prev) =>
            prev.map((p) => ({
              ...p,
              departments: p.departments.map((d) => ({
                ...d,
                agents: d.agents.map((a) => (a.id === next.id ? { ...a, ...next } : a)),
              })),
            })),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  /* ---------------- connectors: Conductor から各部門ヘッダへの曲線 ---------------- */
  const stageRef = useRef<HTMLElement | null>(null);
  const conductorRef = useRef<HTMLDivElement | null>(null);
  const headRefs = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<string[]>([]);
  const [viewBox, setViewBox] = useState('0 0 0 0');

  const registerHead = useCallback((departmentId: string, node: HTMLElement | null) => {
    if (node) headRefs.current.set(departmentId, node);
    else headRefs.current.delete(departmentId);
  }, []);

  const draw = useCallback(() => {
    const stage = stageRef.current;
    const conductor = conductorRef.current;
    if (!stage || !conductor) return;

    const stageBox = stage.getBoundingClientRect();
    const from = conductor.getBoundingClientRect();
    const fx = from.left + from.width / 2 - stageBox.left;
    const fy = from.bottom - stageBox.top;

    const next: string[] = [];
    for (const department of project.departments) {
      const head = headRefs.current.get(department.id);
      if (!head) continue;
      const headBox = head.getBoundingClientRect();
      const tx = headBox.left + headBox.width / 2 - stageBox.left;
      const ty = headBox.top - stageBox.top;
      const midY = fy + (ty - fy) * 0.5;
      next.push(`M ${fx} ${fy} C ${fx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`);
    }

    // ResizeObserver から呼ばれるので、変化が無いときは再レンダーさせない。
    setPaths((prev) =>
      prev.length === next.length && prev.every((d, i) => d === next[i]) ? prev : next,
    );
    setViewBox(`0 0 ${stageBox.width} ${stageBox.height}`);
  }, [project.departments]);

  useLayoutEffect(() => {
    draw();
  }, [draw, collapsed]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(stage);
    window.addEventListener('resize', draw);
    // Webフォント適用後にレイアウトがずれるぶんを拾い直す。
    const timer = window.setTimeout(draw, 120);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', draw);
      window.clearTimeout(timer);
    };
  }, [draw]);

  /* ---------------- handlers ---------------- */
  function switchProject(id: string) {
    if (id === currentProjectId) return;
    setCurrentProjectId(id);
    setCollapsed({});
    setSelection(null);
    setInspectorOpen(false);
  }

  function toggleDepartment(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openInspector(department: Department, agent: Agent) {
    setSelection({ agentId: agent.id, departmentId: department.id });
    setInspectorOpen(true);
  }

  const closeInspector = useCallback(() => setInspectorOpen(false), []);

  /* ---------------- derived ---------------- */
  const selectedDepartment =
    project.departments.find((d) => d.id === selection?.departmentId) ?? null;
  const selectedAgent =
    selectedDepartment?.agents.find((a) => a.id === selection?.agentId) ?? null;

  const stats = useMemo(() => {
    let total = 0;
    let online = 0;
    let tasks = 0;
    for (const department of project.departments) {
      for (const agent of department.agents) {
        total += 1;
        tasks += agent.tasks_today;
        if (agent.status === 'online') online += 1;
      }
    }
    return { total, online, tasks, departments: project.departments.length };
  }, [project]);

  return (
    <>
      <div className="deck">
        <div className="grid-bg" />
        <div className="aura" />

        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <span>◆</span>
            </div>
            AGENT DECK <small>/ operations</small>
          </div>
          <div className="topbar-right">
            <div className="live-pill">
              <span className="live-dot" />
              LIVE
            </div>
            <Clock />
          </div>
        </header>

        <nav className="tabbar">
          <span className="tabbar-label">PROJECTS</span>
          <div className="tabbar-list">
            {projects.map((p) => (
              <button
                type="button"
                key={p.id}
                className={`ptab ${p.id === currentProjectId ? 'active' : ''}`}
                onClick={() => switchProject(p.id)}
                aria-current={p.id === currentProjectId}
              >
                <span className="pdot" />
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ptab ptab-add"
            title="projects テーブルに行を追加すると、ここにタブが増えます"
          >
            ＋ 追加
          </button>
        </nav>

        <main className="stage" ref={stageRef}>
          <div className="eyebrow">{project.eyebrow}</div>
          <h1 className="stage-title">{project.title}</h1>
          <p className="stage-sub">{project.subtitle}</p>

          <svg className="connectors" viewBox={viewBox} aria-hidden="true">
            {paths.map((d) => (
              <path className="flow" d={d} key={d} />
            ))}
          </svg>

          <div className="conductor" ref={conductorRef}>
            <div className="conductor-badge">AI HEAD</div>
            <div className="conductor-icon">◆</div>
            <div className="conductor-title">CONDUCTOR</div>
            <div className="conductor-sub">{project.conductor_sub}</div>
            <ConductorChat
              key={project.id}
              projectId={project.id}
              placeholder={project.chat_placeholder}
            />
          </div>

          <div className="departments">
            {project.departments.map((department) => (
              <section
                className={`dept ${collapsed[department.id] ? 'collapsed' : ''}`}
                data-dept={department.key}
                key={department.id}
              >
                <button
                  type="button"
                  className="dept-head"
                  ref={(node) => registerHead(department.id, node)}
                  onClick={() => toggleDepartment(department.id)}
                  aria-expanded={!collapsed[department.id]}
                >
                  <span className="dept-icon">◆</span>
                  <span className="dept-name">{department.name}</span>
                  <span className="dept-count">{department.agents.length}</span>
                  <span className="chevron">⌄</span>
                </button>

                <div className="dept-body">
                  {department.agents.map((agent) => (
                    <button
                      type="button"
                      key={agent.id}
                      className={`agent-row ${
                        inspectorOpen && selection?.agentId === agent.id ? 'active' : ''
                      }`}
                      onClick={() => openInspector(department, agent)}
                    >
                      <span className={`dot ${statusClass(agent.status)}`} />
                      <span className="agent-name">{agent.name}</span>
                      <span className="tag">{agent.tag}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>

        <footer className="statusbar">
          <span>
            AGENTS ONLINE{' '}
            <b>
              {stats.online}/{stats.total}
            </b>
          </span>
          <span>
            TASKS TODAY <b>{stats.tasks}</b>
          </span>
          <span>
            UPTIME <b>{averageUptime(project)}%</b>
          </span>
          <span>
            DEPARTMENTS <b>{stats.departments}</b>
          </span>
        </footer>
      </div>

      <Inspector
        agent={selectedAgent}
        department={selectedDepartment}
        open={inspectorOpen}
        onClose={closeInspector}
      />
    </>
  );
}

function statusClass(status: AgentStatus): string {
  return status === 'online' ? 'online' : status === 'idle' ? 'idle' : 'offline';
}

function averageUptime(project: Project): string {
  const uptimes = project.departments.flatMap((d) => d.agents.map((a) => Number(a.uptime)));
  if (uptimes.length === 0) return '—';
  const average = uptimes.reduce((sum, value) => sum + value, 0) / uptimes.length;
  return average.toFixed(1);
}
