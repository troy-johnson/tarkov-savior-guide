import { toQuestCompletion } from '../dashboard/dashboardData';
import type { StoryQuestView } from '../../types';

interface StorylineProgressViewProps {
  storyQuests: StoryQuestView[];
}

export function StorylineProgressView({ storyQuests }: StorylineProgressViewProps) {
  const mapBreakdown = Object.entries(
    storyQuests.flatMap((quest) => quest.steps).reduce<Record<string, { total: number; complete: number; active: number }>>((acc, step) => {
      const entry = acc[step.map] ?? { total: 0, complete: 0, active: 0 };
      entry.total += 1;
      if (step.progress.status === 'done') entry.complete += 1;
      if (step.isActive) entry.active += 1;
      acc[step.map] = entry;
      return acc;
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right));

  return (
    <section className="details-section details-section--standalone">
      <div className="section-heading">
        <h2>STORYLINE PROGRESS</h2>
        <p>{storyQuests.length} storyline quests</p>
      </div>

      <div className="storyline-grid">
        {storyQuests.map((quest) => {
          const completion = toQuestCompletion(quest);
          return (
            <article key={quest.id} className="task-card storyline-card">
              <div className="storyline-card__header">
                <div>
                  <p className="task-card__eyebrow">STORYLINE QUEST</p>
                  <h3>{quest.sort_order}. {quest.title}</h3>
                </div>
                <strong>{completion}%</strong>
              </div>
              <p className="task-card__description">{quest.summary}</p>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${completion}%` }} />
              </div>
              <dl className="storyline-stats">
                <div>
                  <dt>Required steps</dt>
                  <dd>{quest.requiredSteps}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{quest.completedSteps}</dd>
                </div>
                <div>
                  <dt>Active now</dt>
                  <dd>{quest.activeSteps.length}</dd>
                </div>
              </dl>
              <div>
                <p className="meta-label">Current stage</p>
                <p>{quest.activeSteps.length > 0 ? quest.activeSteps.map((step) => `${step.map}: ${step.title}`).join(' · ') : 'Quest complete'}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="analysis-grid">
        <article className="panel analysis-panel">
          <div className="section-heading section-heading--compact">
            <h2>MAP BREAKDOWN</h2>
            <p>All storyline step coverage</p>
          </div>
          <div className="map-breakdown-list">
            {mapBreakdown.map(([map, summary]) => (
              <div key={map} className="metric-row">
                <div>
                  <strong>{map}</strong>
                  <p>{summary.complete} / {summary.total} complete · {summary.active} active</p>
                </div>
                <span>{summary.total}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel analysis-panel">
          <div className="section-heading section-heading--compact">
            <h2>ACTIVE STEP CHAIN</h2>
            <p>Next incomplete stage in each quest</p>
          </div>
          <div className="dependency-list">
            {storyQuests.map((quest) => (
              <div key={quest.id} className="dependency-item">
                <strong>{quest.title}</strong>
                <p>{quest.activeSteps.length > 0 ? quest.activeSteps.map((step) => `${step.map} → ${step.title}`).join(' // ') : 'Complete'}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
