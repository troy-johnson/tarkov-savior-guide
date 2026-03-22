import type { ChangeEvent } from 'react';
import type { SharedTaskView, TaskStatus } from '../types';

const statusOptions: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'done'];

interface TaskCardProps {
  task: SharedTaskView;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPercentChange: (taskId: string, percent: number) => void;
  onNoteChange: (taskId: string, note: string) => void;
}

const statusLabel: Record<TaskStatus, string> = {
  not_started: 'Pending',
  in_progress: 'Tracking',
  blocked: 'Blocked',
  done: 'Complete',
};

export function TaskCard({ task, onStatusChange, onPercentChange, onNoteChange }: TaskCardProps) {
  const handlePercent = (event: ChangeEvent<HTMLInputElement>) => {
    onPercentChange(task.id, Number(event.target.value));
  };

  return (
    <article className="task-card">
      <div className="task-card__header">
        <div>
          <p className="task-card__eyebrow">{task.storyline} // {task.map}</p>
          <h3>{task.sort_order}. {task.title}</h3>
        </div>
        <label className="task-card__select">
          <span className="meta-label">STATUS</span>
          <select value={task.progress.status} onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="task-card__description">{task.description}</p>

      <dl className="task-card__meta">
        <div>
          <dt>Requirements</dt>
          <dd>{task.requirements.join(', ')}</dd>
        </div>
        <div>
          <dt>Depends on</dt>
          <dd>{task.dependencies_json.length > 0 ? task.dependencies_json.join(', ') : 'None'}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{task.major_evidence}</dd>
        </div>
      </dl>

      <label className="task-card__range">
        <span>Completion: {task.progress.percent_complete}%</span>
        <input type="range" min="0" max="100" step="5" value={task.progress.percent_complete} onChange={handlePercent} />
      </label>

      <label className="task-card__note">
        <span>Field note</span>
        <textarea
          rows={3}
          value={task.progress.current_note}
          onChange={(event) => onNoteChange(task.id, event.target.value)}
          placeholder="Log the current state of this objective..."
        />
      </label>

      <p className="task-card__updated">Updated {new Date(task.progress.updated_at).toLocaleString()}</p>
    </article>
  );
}
