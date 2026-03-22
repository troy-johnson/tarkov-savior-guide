import type { SharedTaskView, TaskStatus } from '../../types';
import { statusLabel } from '../dashboard/dashboardData';

interface QuestInformationViewProps {
  sharedTasks: SharedTaskView[];
}

const statusOrder: TaskStatus[] = ['blocked', 'in_progress', 'not_started', 'done'];

export function QuestInformationView({ sharedTasks }: QuestInformationViewProps) {
  const sortedTasks = [...sharedTasks].sort((left, right) => {
    const statusDelta = statusOrder.indexOf(left.progress.status) - statusOrder.indexOf(right.progress.status);
    if (statusDelta !== 0) {
      return statusDelta;
    }
    return left.sort_order - right.sort_order;
  });

  return (
    <section className="details-section details-section--standalone">
      <div className="section-heading">
        <h2>QUEST INFORMATION</h2>
        <p>{sharedTasks.length} detailed task records</p>
      </div>

      <div className="quest-info-list">
        {sortedTasks.map((task) => (
          <article key={task.id} className="panel quest-info-card">
            <div className="quest-info-card__header">
              <div>
                <p className="task-card__eyebrow">{task.storyline} // {task.map}</p>
                <h3>{task.sort_order}. {task.title}</h3>
              </div>
              <div className={`status-chip status-chip--${task.progress.status}`}>
                {statusLabel[task.progress.status]}
              </div>
            </div>

            <p className="quest-info-card__description">{task.description}</p>

            <div className="quest-info-card__grid">
              <div>
                <p className="meta-label">Evidence</p>
                <p>{task.major_evidence}</p>
              </div>
              <div>
                <p className="meta-label">Requirements</p>
                <p>{task.requirements.join(', ')}</p>
              </div>
              <div>
                <p className="meta-label">Dependencies</p>
                <p>{task.dependencies_json.length > 0 ? task.dependencies_json.join(', ') : 'None'}</p>
              </div>
              <div>
                <p className="meta-label">Field Note</p>
                <p>{task.progress.current_note || 'No field notes recorded yet.'}</p>
              </div>
            </div>

            <div className="quest-info-card__footer">
              <span>Completion: {task.progress.percent_complete}%</span>
              <span>Updated {new Date(task.progress.updated_at).toLocaleString()}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
