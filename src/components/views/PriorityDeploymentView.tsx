import { TaskCard } from '../TaskCard';
import { bossIntelByMap, mapTelemetry, statusLabel, toDirectiveSubtitle, toGearList } from '../dashboard/dashboardData';
import type { RunRecord, SharedTaskView } from '../../types';

interface PriorityDeploymentViewProps {
  activeTask?: SharedTaskView;
  completion: number;
  refresh: () => Promise<void>;
  run: RunRecord;
  setStatus: (taskId: string, status: SharedTaskView['progress']['status']) => Promise<void>;
  sharedTasks: SharedTaskView[];
  syncMode: 'supabase' | 'local-seed';
  updateTask: (taskId: string, changes: Partial<Pick<SharedTaskView['progress'], 'status' | 'percent_complete' | 'current_note'>>) => Promise<void>;
}

export function PriorityDeploymentView({ activeTask, completion, refresh, run, setStatus, sharedTasks, syncMode, updateTask }: PriorityDeploymentViewProps) {
  const telemetry = mapTelemetry[activeTask?.map ?? 'Labs'] ?? mapTelemetry.Labs;
  const bossIntel = bossIntelByMap[activeTask?.map ?? 'Labs'] ?? bossIntelByMap.Labs;
  const gearList = activeTask ? toGearList(activeTask) : [];
  const systemLogs = !activeTask
    ? ['[SYS_LOG]: awaiting_task_stream...']
    : [
        `[SYS_LOG]: map_stream_established...${activeTask.map.toLowerCase().replace(/\s+/g, '_')}`,
        `[SYS_LOG]: obj_${activeTask.id.replace(/-/g, '_')}_loaded...`,
        `[SYS_LOG]: sync_mode_${syncMode} // completion_${completion}%`,
      ];

  return (
    <>
      <section className="command-grid">
        <article className="panel panel--directive">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">CURRENT DIRECTIVE</p>
              <h1>{activeTask ? activeTask.map.toUpperCase() : 'NO ACTIVE MAP'}</h1>
              <p className="panel__subhead">{activeTask ? toDirectiveSubtitle(activeTask) : 'Awaiting route intel'}</p>
            </div>
            <div className="directive-id">ID: {activeTask ? `SV-${String(activeTask.sort_order).padStart(4, '0')}` : 'SV-0000'}</div>
          </div>

          <ul className="objective-list">
            {sharedTasks.map((task) => {
              const checked = task.progress.status === 'done';
              return (
                <li key={task.id} className={`objective-item${checked ? ' is-done' : ''}`}>
                  <button
                    type="button"
                    className={`objective-checkbox status-${task.progress.status}`}
                    onClick={() => void setStatus(task.id, checked ? 'not_started' : 'done')}
                    aria-label={`Mark ${task.title} ${checked ? 'not complete' : 'complete'}`}
                  >
                    {checked ? '✓' : ''}
                  </button>
                  <div>
                    <p>{task.title}</p>
                    <span>{statusLabel[task.progress.status]} · {task.progress.percent_complete}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>

        <aside className="right-rail">
          <article className="panel panel--map">
            <p className="map-tag">◎ {telemetry.areaLabel}</p>
            <div className="map-canvas">
              <div className="map-canvas__shape" />
              <button type="button" className="expand-button">↗ EXPAND MAP</button>
            </div>
            <div className="map-meta">
              <div>
                <p className="meta-label">COORDINATES</p>
                <p>{telemetry.coordinates}</p>
              </div>
              <div className="map-status">● SIGNAL LATCHED</div>
            </div>
            <div>
              <p className="meta-label">SECTOR</p>
              <p>{telemetry.sector}</p>
            </div>
          </article>

          <article className="panel panel--logs">
            {systemLogs.map((entry) => (
              <p key={entry}>{entry}</p>
            ))}
          </article>
        </aside>

        <article className="panel panel--alert">
          <div className="alert-header">
            <span>▲ LIVE BOSS INTEL</span>
            <span>PRIORITY: HIGH</span>
          </div>
          <div className="alert-card">
            <div>
              <h2>{bossIntel.name}</h2>
              <p className="meta-label">{bossIntel.secondary}</p>
              <strong>{bossIntel.activity}</strong>
            </div>
            <span className="alert-pill">{bossIntel.spawn.toUpperCase()}</span>
          </div>
          <div className="intel-row">
            <div>
              <p className="meta-label">THREAT</p>
              <strong>{bossIntel.threat}</strong>
            </div>
            <div>
              <p className="meta-label">RUN ID</p>
              <strong>{run.id}</strong>
            </div>
          </div>
          <button type="button" className="secondary-button" onClick={() => void refresh()}>ACCESS INTEL FEED</button>
        </article>

        <article className="panel panel--gear">
          <p className="panel__eyebrow">FIELD LOGISTICS</p>
          <h2>REQUIRED GEAR</h2>
          <div className="gear-list">
            {gearList.map((item) => (
              <div key={item.label} className={`gear-item gear-item--${item.accent}`}>
                <span>{item.label.toUpperCase()}</span>
                <strong>{item.quantity}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="details-section">
        <div className="section-heading">
          <h2>PRIORITY DEPLOYMENT</h2>
          <p>{sharedTasks.length} tracked objectives</p>
        </div>
        <div className="task-grid">
          {sharedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(taskId, status) => void setStatus(taskId, status)}
              onPercentChange={(taskId, percent) => void updateTask(taskId, { percent_complete: percent })}
              onNoteChange={(taskId, note) => void updateTask(taskId, { current_note: note, status: 'in_progress' })}
            />
          ))}
        </div>
      </section>
    </>
  );
}
