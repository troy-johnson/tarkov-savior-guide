import { useEffect, useMemo, useState } from 'react';
import type { StepStatus, StepView, StoryQuestView } from '../../types';
import { statusLabel, stepTypeLabel } from '../dashboard/dashboardData';

interface QuestInformationViewProps {
  setStatus: (stepId: string, status: StepStatus) => Promise<void>;
  storyQuests: StoryQuestView[];
  updateStep: (stepId: string, changes: Partial<Pick<StepView['progress'], 'status' | 'current_note'>>) => Promise<void>;
}

const statusOptions: StepStatus[] = ['not_started', 'in_progress', 'blocked', 'done'];

function getQuestStateLabel(quest: StoryQuestView) {
  if (quest.isComplete) {
    return 'Complete';
  }

  if (quest.activeSteps.length > 0) {
    return `${quest.activeSteps.length} Active`;
  }

  return 'Queued';
}

function getQuestStateTone(quest: StoryQuestView) {
  if (quest.isComplete) {
    return 'done';
  }

  if (quest.activeSteps.length > 0) {
    return 'in_progress';
  }

  return 'not_started';
}

export function QuestInformationView({ setStatus, storyQuests, updateStep }: QuestInformationViewProps) {
  const [selectedQuestId, setSelectedQuestId] = useState(storyQuests[0]?.id ?? '');

  useEffect(() => {
    if (storyQuests.length === 0) {
      if (selectedQuestId !== '') {
        setSelectedQuestId('');
      }
      return;
    }

    const hasSelectedQuest = storyQuests.some((quest) => quest.id === selectedQuestId);
    if (!hasSelectedQuest) {
      setSelectedQuestId(storyQuests[0].id);
    }
  }, [selectedQuestId, storyQuests]);

  const selectedQuestIndex = useMemo(
    () => storyQuests.findIndex((quest) => quest.id === selectedQuestId),
    [selectedQuestId, storyQuests],
  );

  const selectedQuest = selectedQuestIndex >= 0 ? storyQuests[selectedQuestIndex] : storyQuests[0];
  const previousQuest = selectedQuestIndex > 0 ? storyQuests[selectedQuestIndex - 1] : null;
  const nextQuest = selectedQuestIndex >= 0 && selectedQuestIndex < storyQuests.length - 1 ? storyQuests[selectedQuestIndex + 1] : null;

  return (
    <section className="details-section details-section--standalone">
      <div className="section-heading">
        <div>
          <h2>QUEST INFORMATION</h2>
          <p>{storyQuests.length} storyline quest records</p>
        </div>
        {selectedQuest ? (
          <div className="quest-nav-summary">
            <span className="meta-label">Quest Navigator</span>
            <strong>
              {selectedQuestIndex + 1} / {storyQuests.length}
            </strong>
          </div>
        ) : null}
      </div>

      {selectedQuest ? (
        <>
          <div className="panel quest-navigator">
            <div className="quest-navigator__controls">
              <button
                type="button"
                className="secondary-button quest-navigator__button"
                onClick={() => previousQuest && setSelectedQuestId(previousQuest.id)}
                disabled={!previousQuest}
              >
                ← Previous Quest
              </button>
              <label className="quest-navigator__picker">
                <span className="meta-label">Selected Quest</span>
                <select value={selectedQuest.id} onChange={(event) => setSelectedQuestId(event.target.value)}>
                  {storyQuests.map((quest, index) => (
                    <option key={quest.id} value={quest.id}>
                      {index + 1}. {quest.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary-button quest-navigator__button"
                onClick={() => nextQuest && setSelectedQuestId(nextQuest.id)}
                disabled={!nextQuest}
              >
                Next Quest →
              </button>
            </div>

            <div className="quest-navigator__rail" aria-label="Quest navigation list">
              {storyQuests.map((quest) => (
                <button
                  key={quest.id}
                  type="button"
                  className={`quest-navigator__item${quest.id === selectedQuest.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedQuestId(quest.id)}
                >
                  <span className="quest-navigator__item-order">{quest.sort_order.toString().padStart(2, '0')}</span>
                  <span className="quest-navigator__item-copy">
                    <strong>{quest.title}</strong>
                    <span>{getQuestStateLabel(quest)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <article className="panel quest-group-card quest-group-card--focused">
            <div className="quest-group-card__header">
              <div>
                <p className="task-card__eyebrow">{selectedQuest.storyline} // QUEST {selectedQuest.sort_order}</p>
                <h3>{selectedQuest.title}</h3>
              </div>
              <div className={`status-chip status-chip--${getQuestStateTone(selectedQuest)}`}>
                {getQuestStateLabel(selectedQuest)}
              </div>
            </div>
            <p className="quest-info-card__description">{selectedQuest.summary}</p>
            <div className="source-list">
              {selectedQuest.source_urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a>
              ))}
            </div>

            <div className="quest-step-list">
              {selectedQuest.steps.map((step) => (
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
        </>
      ) : (
        <div className="panel empty-state">No quest records available.</div>
      )}
    </section>
  );
}
