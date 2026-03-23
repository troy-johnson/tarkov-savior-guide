import { useEffect, useMemo, useState } from 'react';
import { getTabFromHash, tabs, tabMeta } from './components/dashboard/dashboardData';
import { PriorityDeploymentView } from './components/views/PriorityDeploymentView';
import { QuestInformationView } from './components/views/QuestInformationView';
import { StorylineProgressView } from './components/views/StorylineProgressView';
import { useSharedProgress } from './hooks/useSharedProgress';

function App() {
  const {
    activeMapBreakdown,
    bossIntel,
    bossIntelByMap,
    completion,
    error,
    lastSyncedAt,
    loading,
    mapTelemetryByMap,
    mapPriorityPlans,
    mapTelemetry,
    nextNonRaidSteps,
    priorityMap,
    prioritySetupSteps,
    prioritySteps,
    refresh,
    refreshing,
    run,
    remoteHealth,
    selectRun,
    setStatus,
    storyQuests,
    syncMode,
    updateStep,
  } = useSharedProgress();
  const [runInput, setRunInput] = useState(run.id);
  const [activeTab, setActiveTab] = useState(() => getTabFromHash(window.location.hash));
  const [selectedPriorityMap, setSelectedPriorityMap] = useState(priorityMap);

  useEffect(() => {
    setRunInput(run.id);
  }, [run.id]);

  useEffect(() => {
    if (!mapPriorityPlans.some((plan) => plan.map === selectedPriorityMap)) {
      setSelectedPriorityMap(priorityMap);
    }
  }, [mapPriorityPlans, priorityMap, selectedPriorityMap]);

  useEffect(() => {
    const syncTabFromLocation = () => setActiveTab(getTabFromHash(window.location.hash));
    syncTabFromLocation();
    window.addEventListener('hashchange', syncTabFromLocation);
    return () => window.removeEventListener('hashchange', syncTabFromLocation);
  }, []);

  useEffect(() => {
    const nextHash = tabMeta[activeTab].hash;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }, [activeTab]);

  const activeTabMeta = useMemo(() => tabMeta[activeTab], [activeTab]);
  const requiredSteps = storyQuests.reduce((sum, quest) => sum + quest.requiredSteps, 0);
  const isSyncBusy = loading || refreshing;
  const selectedPlan = useMemo(
    () => mapPriorityPlans.find((plan) => plan.map === selectedPriorityMap) ?? mapPriorityPlans[0],
    [mapPriorityPlans, selectedPriorityMap],
  );
  const displayedPriorityMap = selectedPlan?.map ?? priorityMap;
  const displayedPrioritySteps = selectedPlan?.currentSteps ?? prioritySteps;
  const displayedPrioritySetupSteps = selectedPlan?.setupSteps ?? prioritySetupSteps;
  const selectedMapTelemetry = mapTelemetryByMap[displayedPriorityMap] ?? mapTelemetry;
  const selectedBossIntel = bossIntelByMap[displayedPriorityMap] ?? bossIntel;
  const syncBannerText = error
    ? `Database unavailable, using local fallback: ${error}`
    : remoteHealth === 'connected'
      ? 'Database connected, syncing normally.'
      : remoteHealth === 'degraded'
        ? 'Database unavailable, using local fallback.'
        : 'Database unavailable, using local fallback.';

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="topbar__brand">
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
        <button type="button" className="refresh-button" disabled={isSyncBusy} onClick={() => void refresh()}>
          {isSyncBusy ? 'SYNCING…' : 'REFRESH SYNC'}
        </button>
      </header>

      <section className={`status-banner${error || remoteHealth !== 'connected' ? ' status-banner--error' : ''}`}>
          <div className="status-banner__content">
            <span>{isSyncBusy ? (refreshing ? 'Refreshing shared progress…' : 'Loading shared progress…') : syncBannerText}</span>
            {isSyncBusy ? (
              <div className="status-banner__progress" aria-label="Shared progress is loading" aria-live="polite">
                <div className="status-banner__progress-track" aria-hidden="true">
                  <span className="status-banner__progress-fill" />
                </div>
                <small>{refreshing ? 'Pulling the latest run, quest, and progress rows from sync…' : 'Seeding the current run and syncing remote quest progress…'}</small>
              </div>
            ) : null}
          </div>
          <span>{remoteHealth === 'connected' ? 'SYNC OK' : 'LOCAL FALLBACK'}</span>
        </section>

      <section className="control-strip">
        <label className="control-card">
          <span className="meta-label">SHARED RUN LINK / INVITE CODE</span>
          <div className="control-card__inline">
            <input value={runInput} onChange={(event) => setRunInput(event.target.value)} placeholder="shared-savior-run" />
            <button type="button" disabled={isSyncBusy} onClick={() => void selectRun(runInput)}>JOIN RUN</button>
          </div>
        </label>
        <div className="control-card control-card--stats">
          <div>
            <span className="meta-label">SYNC MODE</span>
            <strong>{syncMode.toUpperCase()}</strong>
          </div>
          <div>
            <span className="meta-label">STEP COMPLETION</span>
            <strong>{completion}%</strong>
          </div>
          <div>
            <span className="meta-label">PRIORITY MAP</span>
            <strong>{displayedPriorityMap}</strong>
          </div>
          <div>
            <span className="meta-label">TRACKED STEPS</span>
            <strong>{requiredSteps}</strong>
          </div>
          <div>
            <span className="meta-label">LAST SYNC</span>
            <strong>{lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'PENDING'}</strong>
          </div>
        </div>
      </section>

      {activeTab === 'PRIORITY_DEPLOYMENT' ? (
        <PriorityDeploymentView
          activeMapBreakdown={activeMapBreakdown}
          bossIntel={selectedBossIntel}
          completion={completion}
          loading={isSyncBusy}
          mapTelemetry={selectedMapTelemetry}
          nextNonRaidSteps={nextNonRaidSteps}
          priorityMap={displayedPriorityMap}
          prioritySetupSteps={displayedPrioritySetupSteps}
          prioritySteps={displayedPrioritySteps}
          refresh={refresh}
          run={run}
          selectedPriorityMap={displayedPriorityMap}
          setStatus={setStatus}
          setSelectedPriorityMap={setSelectedPriorityMap}
          syncMode={syncMode}
          updateStep={updateStep}
        />
      ) : null}

      {activeTab === 'STORYLINE_PROGRESS' ? <StorylineProgressView storyQuests={storyQuests} /> : null}
      {activeTab === 'QUEST_INFORMATION' ? (
        <QuestInformationView loading={isSyncBusy} storyQuests={storyQuests} setStatus={setStatus} updateStep={updateStep} />
      ) : null}

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
