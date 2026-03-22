import { useMemo, useState } from 'react';
import { TaskCard } from './components/TaskCard';
import { useSharedProgress } from './hooks/useSharedProgress';
import type { SharedTaskView, TaskStatus } from './types';

const tabs = ['PRIORITY_DEPLOYMENT', 'STORYLINE_PROGRESS', 'QUEST_INFORMATION'] as const;

type TabKey = (typeof tabs)[number];

const mapTelemetry: Record<string, { coordinates: string; sector: string; areaLabel: string }> = {
  'Ground Zero': {
    coordinates: '40.7128° N, 74.0060° W',
    sector: 'CIVIC_MEDICAL_NODE // GZ-01',
    areaLabel: 'AREA_IDENTIFIED: GROUND_ZERO',
  },
  'Streets of Tarkov': {
    coordinates: '59.9343° N, 30.3351° E',
    sector: 'CONVOY_GRID // ST-02',
    areaLabel: 'AREA_IDENTIFIED: STREETS',
  },
  Lighthouse: {
    coordinates: '43.0952° N, 131.8735° E',
    sector: 'EVAC_ROUTE // LH-03',
    areaLabel: 'AREA_IDENTIFIED: LIGHTHOUSE',
  },
  Labs: {
    coordinates: '52.4839° N, 13.3364° E',
    sector: 'TERRAGROUP_SUB_04 // ALPHA_LEVEL_3',
    areaLabel: 'AREA_IDENTIFIED: THE_LABS',
  },
};

const bossIntelByMap: Record<string, { name: string; secondary: string; threat: string; spawn: string; activity: string }> = {
  'Ground Zero': {
    name: 'SCAV PATROL',
    secondary: 'Civilian perimeter disturbed',
    threat: 'MODERATE',
    spawn: '76% sweep',
    activity: 'Checkpoint pressure rising',
  },
  'Streets of Tarkov': {
    name: 'KABAN',
    secondary: 'Convoy interception route active',
    threat: 'SEVERE',
    spawn: '62% sweep',
    activity: 'Guards circling dealership block',
  },
  Lighthouse: {
    name: 'ROGUE OUTPOST',
    secondary: 'Shoreline lane still contested',
    threat: 'HIGH',
    spawn: '81% sweep',
    activity: 'Watchtower eyes on southern crossing',
  },
  Labs: {
    name: 'KILLA',
    secondary: 'Reports: recent',
    threat: 'EXTREME',
    spawn: '100% spawn',
    activity: '02 sector // mid',
  },
};

const statusLabel: Record<TaskStatus, string> = {
  not_started: 'Pending',
  in_progress: 'Tracking',
  blocked: 'Blocked',
  done: 'Complete',
};

function toDirectiveSubtitle(task: SharedTaskView) {
  return task.storyline === 'Savior' ? 'THE SAVIOR PROTOCOL' : task.storyline.toUpperCase();
}

function toGearList(task: SharedTaskView) {
  const gear = task.requirements.map((item) => {
    const lowered = item.toLowerCase();
    if (lowered.includes('camera')) {
      return { label: 'WiFi camera', quantity: 'x2', accent: 'amber' as const };
    }
    if (lowered.includes('med')) {
      return { label: 'Compact medkit', quantity: 'x1', accent: 'amber' as const };
    }
    if (lowered.includes('signal')) {
      return { label: 'Signal jammer', quantity: 'x1', accent: 'amber' as const };
    }
    if (lowered.includes('lighthouse keeper')) {
      return { label: 'Blue keycard', quantity: 'REQ.', accent: 'sage' as const };
    }
    return { label: item, quantity: 'REQ.', accent: 'sage' as const };
  });

  if (!gear.some((entry) => entry.label.toLowerCase().includes('marker'))) {
    gear.unshift({ label: 'MS2000 marker', quantity: 'x3', accent: 'amber' as const });
  }

  return gear.slice(0, 3);
}

function App() {
  const { completion, error, loading, refresh, run, selectRun, setStatus, sharedTasks, syncMode, updateTask } = useSharedProgress();
  const [runInput, setRunInput] = useState(run.id);
  const [activeTab, setActiveTab] = useState<TabKey>('PRIORITY_DEPLOYMENT');

  const activeTask = useMemo(
    () => sharedTasks.find((task) => task.progress.status !== 'done') ?? sharedTasks[0],
    [sharedTasks],
  );

  const telemetry = mapTelemetry[activeTask?.map ?? 'Labs'] ?? mapTelemetry.Labs;
  const bossIntel = bossIntelByMap[activeTask?.map ?? 'Labs'] ?? bossIntelByMap.Labs;
  const gearList = activeTask ? toGearList(activeTask) : [];

  const systemLogs = useMemo(() => {
    if (!activeTask) {
      return ['[SYS_LOG]: awaiting_task_stream...'];
    }

    return [
      `[SYS_LOG]: map_stream_established...${activeTask.map.toLowerCase().replace(/\s+/g, '_')}`,
      `[SYS_LOG]: obj_${activeTask.id.replace(/-/g, '_')}_loaded...`,
      `[SYS_LOG]: sync_mode_${syncMode} // completion_${completion}%`,
    ];
  }, [activeTask, completion, syncMode]);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand">TARKOV_SAVIOR_GUIDE</div>
        <nav className="topbar__nav" aria-label="Dashboard views">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-button${tab === activeTab ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        <button type="button" className="refresh-button" onClick={() => void refresh()}>
          REFRESH SYNC
        </button>
      </header>

      {(error || loading) ? (
        <section className={`status-banner${error ? ' status-banner--error' : ''}`}>
          <span>{error ? `Realtime sync fallback: ${error}` : 'Loading shared progress…'}</span>
          <span>{syncMode.toUpperCase()}</span>
        </section>
      ) : null}

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

      <section className="control-strip">
        <label className="control-card">
          <span className="meta-label">SHARED RUN LINK / INVITE CODE</span>
          <div className="control-card__inline">
            <input value={runInput} onChange={(event) => setRunInput(event.target.value)} placeholder="shared-savior-run" />
            <button type="button" onClick={() => void selectRun(runInput)}>JOIN RUN</button>
          </div>
        </label>
        <div className="control-card control-card--stats">
          <div>
            <span className="meta-label">SYNC MODE</span>
            <strong>{syncMode.toUpperCase()}</strong>
          </div>
          <div>
            <span className="meta-label">AVERAGE COMPLETION</span>
            <strong>{completion}%</strong>
          </div>
        </div>
      </section>

      <section className="details-section">
        <div className="section-heading">
          <h2>{activeTab.replaceAll('_', ' ')}</h2>
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

      <footer className="footer-bar">
        <span>◼ CONNECTION: SECURE</span>
        <span>LATENCY: 24MS</span>
        <span>VER: 0.14.9.SAVIOR</span>
        <span>CURRENT TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </footer>
    </main>
  );
}

export default App;
