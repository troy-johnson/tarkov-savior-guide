import type { StepStatus, StepView, StoryQuestView } from '../../types';
import { statusLabel, stepTypeLabel } from '../dashboard/dashboardData';

interface QuestInformationViewProps {
  setStatus: (stepId: string, status: StepStatus) => Promise<void>;
  storyQuests: StoryQuestView[];
  updateStep: (stepId: string, changes: Partial<Pick<StepView['progress'], 'status' | 'current_note'>>) => Promise<void>;
}

const statusOptions: StepStatus[] = ['not_started', 'in_progress', 'blocked', 'done'];

export function QuestInformationView({ setStatus, storyQuests, updateStep }: QuestInformationViewProps) {
  return (
    <section className="details-section details-section--standalone">
      <div className="section-heading">
        <h2>QUEST INFORMATION</h2>
        <p>{storyQuests.length} storyline quest records</p>
      </div>

      <div className="quest-group-list">
        {storyQuests.map((quest) => (
          <article key={quest.id} className="panel quest-group-card">
            <div className="quest-group-card__header">
              <div>
                <p className="task-card__eyebrow">{quest.storyline} // QUEST {quest.sort_order}</p>
                <h3>{quest.title}</h3>
              </div>
              <div className={`status-chip status-chip--${quest.isComplete ? 'done' : quest.activeSteps.length > 0 ? 'in_progress' : 'not_started'}`}>
                {quest.isComplete ? 'Complete' : `${quest.activeSteps.length} Active`}
              </div>
            </div>
            <p className="quest-info-card__description">{quest.summary}</p>
            <div className="source-list">
              {quest.source_urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a>
              ))}
            </div>

            <div className="quest-step-list">
              {quest.steps.map((step) => (
                <div key={step.id} className={`quest-step-row${step.isActive ? ' is-active' : ''}`}>
                  <div className="quest-step-row__title">
                    <button
                      type="button"
                      className={`objective-checkbox status-${step.progress.status}`}
                      onClick={() => void setStatus(step.id, step.progress.status === 'done' ? 'not_started' : 'done')}
                      aria-label={`Mark ${step.title} ${step.progress.status === 'done' ? 'not complete' : 'complete'}`}
                    >
                      {step.progress.status === 'done' ? '✓' : ''}
                    </button>
                    <div>
                      <strong>{step.sort_order}. {step.title}</strong>
                      <p>{step.map} · {stepTypeLabel[step.step_type]}{step.isActive ? ' · Active now' : ''}</p>
                    </div>
                  </div>
                  <p>{step.details}</p>
                  <div className="quest-step-row__controls">
                    <label>
                      <span className="meta-label">Step State</span>
                      <select value={step.progress.status} onChange={(event) => void setStatus(step.id, event.target.value as StepStatus)}>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{statusLabel[status]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="quest-info-card__note">
                      <span className="meta-label">Field Note</span>
                      <textarea
                        rows={2}
                        value={step.progress.current_note}
                        onChange={(event) => void updateStep(step.id, { current_note: event.target.value, status: 'in_progress' })}
                        placeholder="Log the current state of this step..."
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
