import { TaskCard } from '../TaskCard';
import { statusLabel, toDirectiveSubtitle, toRequiredGearList } from '../dashboard/dashboardData';
import type { BossIntelRecord, MapTelemetryRecord, RunRecord, StepStatus, StepView } from '../../types';

interface PriorityDeploymentViewProps {
  activeMapBreakdown: Array<{ map: string; currentCount: number; potentialCount: number; setupCount: number }>;
  bossIntel: BossIntelRecord;
  completion: number;
  loading: boolean;
  mapTelemetry: MapTelemetryRecord;
  nextNonRaidSteps: StepView[];
  priorityMap: string;
  prioritySetupSteps: StepView[];
  prioritySteps: StepView[];
  refresh: () => Promise<void>;
  run: RunRecord;
  selectedPriorityMap: string;
  setStatus: (stepId: string, status: StepStatus) => Promise<void>;
  setSelectedPriorityMap: (map: string) => void;
  syncMode: 'supabase' | 'local-seed';
  updateStep: (stepId: string, changes: Partial<Pick<StepView['progress'], 'status' | 'current_note'>>) => Promise<void>;
}

export function PriorityDeploymentView({
  activeMapBreakdown,
  bossIntel,
  completion,
  loading,
  mapTelemetry,
  nextNonRaidSteps,
  priorityMap,
  prioritySetupSteps,
  prioritySteps,
  refresh,
  run,
  selectedPriorityMap,
  setStatus,
  setSelectedPriorityMap,
  syncMode,
  updateStep,
}: PriorityDeploymentViewProps) {
  const leadStep = prioritySteps[0];
  const gearList = leadStep ? toRequiredGearList([leadStep]) : [];
  const systemLogs = [
    `[SYS_LOG]: priority_map_${priorityMap.toLowerCase().replace(/\s+/g, '_')}`,
    `[SYS_LOG]: active_objectives_${prioritySteps.length}`,
    `[SYS_LOG]: sync_mode_${syncMode} // completion_${completion}%`,
    `[SYS_LOG]: support_steps_${nextNonRaidSteps.length}`,
    `[SYS_LOG]: setup_chain_${prioritySetupSteps.length}`,
  ];

  return (
    <>
      <section className="command-grid">
        <article className="panel panel--directive">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">CURRENT DIRECTIVE</p>
              <h1>{priorityMap.toUpperCase()}</h1>
              <p className="panel__subhead">{leadStep ? toDirectiveSubtitle(leadStep) : 'Awaiting raid-map objective'}</p>
            </div>
            <div className="directive-id">ID: {leadStep ? `SV-${String(leadStep.sort_order).padStart(4, '0')}` : 'SV-0000'}</div>
          </div>

          {prioritySetupSteps.length > 0 ? (
            <div className="directive-setup">
              <p className="meta-label">STACK SETUP</p>
              <div className="directive-setup__list">
                {prioritySetupSteps.map((step) => (
                  <div key={step.id} className="directive-setup__item">
                    <strong>{step.map}</strong>
                    <span>{step.quest.title} · {step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {prioritySteps.length === 0 ? (
            <p className="empty-state">No raid steps are live on this map yet. Clear the setup chain to stack this deployment.</p>
          ) : (
            <ul className="objective-list">
              {prioritySteps.map((step) => {
                const checked = step.progress.status === 'done';
                return (
                  <li key={step.id} className={`objective-item${checked ? ' is-done' : ''}`}>
                    <button
                      type="button"
                      className={`objective-checkbox status-${step.progress.status}`}
                      disabled={loading}
                      onClick={() => void setStatus(step.id, checked ? 'not_started' : 'done')}
                      aria-label={`Mark ${step.title} ${checked ? 'not complete' : 'complete'}`}
                    >
                      {checked ? '✓' : ''}
                    </button>
                    <div>
                      <p>{step.title}</p>
                      <span>{step.quest.title} · {statusLabel[step.progress.status]}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <aside className="right-rail">
          <article className="panel panel--map">
            <p className="map-tag">◎ {mapTelemetry.area_label}</p>
            <div className="map-canvas">
              <div className="map-canvas__shape" />
              <button type="button" className="expand-button">↗ EXPAND MAP</button>
            </div>
            <div className="map-meta">
              <div>
                <p className="meta-label">COORDINATES</p>
                <p>{mapTelemetry.coordinates}</p>
              </div>
              <div className="map-status">● {mapTelemetry.signal_status}</div>
            </div>
            <div>
              <p className="meta-label">SECTOR</p>
              <p>{mapTelemetry.sector}</p>
            </div>
          </article>

          <article className="panel panel--logs">
            {systemLogs.map((entry) => <p key={entry}>{entry}</p>)}
          </article>
        </aside>

        <article className="panel panel--alert">
          <div className="alert-header">
            <span>▲ LIVE BOSS INTEL</span>
            <span>PRIORITY: {bossIntel.priority}</span>
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
            {gearList.length === 0 ? (
              <p className="empty-state">No special gear is required for the current directive.</p>
            ) : gearList.map((item) => (
              <div key={item.label} className={`gear-item gear-item--${item.accent}`}>
                <span>{item.label.toUpperCase()}</span>
                <strong>{item.quantity}</strong>
              </div>
            ))}
          </div>
          <div className="support-queue">
            <p className="meta-label">NON-RAID STEPS</p>
            {nextNonRaidSteps.length === 0 ? (
              <p className="empty-state">No trader, hideout, or wait-gated blockers are active right now.</p>
            ) : (
              nextNonRaidSteps.map((step) => (
                <div key={step.id} className="support-queue__item">
                  <strong>{step.map}</strong>
                  <span>{step.quest.title} · {step.title}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="details-section">
        <div className="section-heading">
          <h2>PRIORITY DEPLOYMENT</h2>
          <p>{prioritySteps.length} active steps available on {priorityMap}</p>
        </div>
        <div className="priority-summary-grid">
          <article className="panel analysis-panel">
            <div className="section-heading section-heading--compact">
              <h2>MAP STACK RANKING</h2>
              <p>Projected raid stack after clearing current blockers</p>
            </div>
            <div className="map-breakdown-list">
              {activeMapBreakdown.map(({ map, currentCount, potentialCount, setupCount }) => (
                <button
                  key={map}
                  type="button"
                  className={`metric-row metric-row--button${selectedPriorityMap === map ? ' is-selected' : ''}`}
                  onClick={() => setSelectedPriorityMap(map)}
                >
                  <div>
                    <strong>{map}</strong>
                    <p>
                      {currentCount} active now · {potentialCount} total in stack
                      {setupCount > 0 ? ` · ${setupCount} setup step${setupCount === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <span>{potentialCount}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
        <div className="task-grid">
          {prioritySteps.map((step) => (
            <TaskCard
              key={step.id}
              disabled={loading}
              step={step}
              onStatusChange={(stepId, status) => void setStatus(stepId, status)}
              onNoteChange={(stepId, note) => void updateStep(stepId, { current_note: note, status: 'in_progress' })}
            />
          ))}
        </div>
      </section>
    </>
  );
}
