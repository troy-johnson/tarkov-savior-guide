import { useEffect, useMemo, useState } from 'react';
import { getTabFromHash, tabs, tabMeta, type TabKey } from './components/dashboard/dashboardData';
import { PriorityDeploymentView } from './components/views/PriorityDeploymentView';
import { QuestInformationView } from './components/views/QuestInformationView';
import { StorylineProgressView } from './components/views/StorylineProgressView';
import { useSharedProgress } from './hooks/useSharedProgress';

function App() {
  const { completion, error, loading, refresh, run, selectRun, setStatus, sharedTasks, syncMode, updateTask } = useSharedProgress();
  const [runInput, setRunInput] = useState(run.id);
  const [activeTab, setActiveTab] = useState<TabKey>(() => getTabFromHash(window.location.hash));

  useEffect(() => {
    setRunInput(run.id);
  }, [run.id]);

  useEffect(() => {
    const syncTabFromLocation = () => {
      setActiveTab(getTabFromHash(window.location.hash));
    };

    syncTabFromLocation();
    window.addEventListener('hashchange', syncTabFromLocation);

    return () => {
      window.removeEventListener('hashchange', syncTabFromLocation);
    };
  }, []);

  useEffect(() => {
    const nextHash = tabMeta[activeTab].hash;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [activeTab]);

  const activeTask = sharedTasks.find((task) => task.progress.status !== 'done') ?? sharedTasks[0];
  const activeTabMeta = useMemo(() => tabMeta[activeTab], [activeTab]);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div>
          <div className="brand">TARKOV_SAVIOR_GUIDE</div>
          <div className="brand-subtitle">{activeTabMeta.description}</div>
        </div>
        <nav className="topbar__nav" aria-label="Dashboard views">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-button${tab === activeTab ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
              aria-current={tab === activeTab ? 'page' : undefined}
            >
              {tabMeta[tab].label}
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
          <div>
            <span className="meta-label">DIRECT LINK</span>
            <strong>{activeTabMeta.hash}</strong>
          </div>
        </div>
      </section>

      {activeTab === 'PRIORITY_DEPLOYMENT' ? (
        <PriorityDeploymentView
          activeTask={activeTask}
          completion={completion}
          refresh={refresh}
          run={run}
          setStatus={setStatus}
          sharedTasks={sharedTasks}
          syncMode={syncMode}
          updateTask={updateTask}
        />
      ) : null}

      {activeTab === 'STORYLINE_PROGRESS' ? <StorylineProgressView sharedTasks={sharedTasks} /> : null}
      {activeTab === 'QUEST_INFORMATION' ? <QuestInformationView sharedTasks={sharedTasks} /> : null}

      <footer className="footer-bar">
        <span>◼ CONNECTION: SECURE</span>
        <span>LATENCY: 24MS</span>
        <span>VER: 0.14.9.SAVIOR</span>
        <span>VIEW: {activeTabMeta.label}</span>
        <span>CURRENT TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </footer>
    </main>
  );
}

export default App;
