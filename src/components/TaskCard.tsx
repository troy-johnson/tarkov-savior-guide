import type { ChangeEvent } from 'react';
import type { StepStatus, StepView } from '../types';
import { statusLabel, stepTypeLabel } from './dashboard/dashboardData';

const statusOptions: StepStatus[] = ['not_started', 'in_progress', 'blocked', 'done'];

interface TaskCardProps {
  step: StepView;
  onStatusChange: (stepId: string, status: StepStatus) => void;
  onNoteChange: (stepId: string, note: string) => void;
}

export function TaskCard({ step, onStatusChange, onNoteChange }: TaskCardProps) {
  const handleNote = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onNoteChange(step.id, event.target.value);
  };

  return (
    <article className={`task-card${step.isActive ? ' task-card--active' : ''}`}>
      <div className="task-card__header">
        <div>
          <p className="task-card__eyebrow">{step.quest.title} // {step.map}</p>
          <h3>{step.sort_order}. {step.title}</h3>
        </div>
        <label className="task-card__select">
          <span className="meta-label">STATUS</span>
          <select value={step.progress.status} onChange={(event) => onStatusChange(step.id, event.target.value as StepStatus)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="task-card__description">{step.details}</p>

      <dl className="task-card__meta">
        <div>
          <dt>Step type</dt>
          <dd>{stepTypeLabel[step.step_type]}</dd>
        </div>
        <div>
          <dt>Current state</dt>
          <dd>{statusLabel[step.progress.status]}</dd>
        </div>
        <div>
          <dt>Priority status</dt>
          <dd>{step.isActive ? 'Active now' : step.isComplete ? 'Cleared' : 'Queued'}</dd>
        </div>
      </dl>

      <label className="task-card__note">
        <span>Field note</span>
        <textarea
          rows={3}
          value={step.progress.current_note}
          onChange={handleNote}
          placeholder="Log the current state of this step..."
        />
      </label>

      <p className="task-card__updated">Updated {new Date(step.progress.updated_at).toLocaleString()}</p>
    </article>
  );
}
