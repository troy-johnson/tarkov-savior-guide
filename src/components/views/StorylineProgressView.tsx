import type { SharedTaskView } from '../../types';

interface StorylineProgressViewProps {
  sharedTasks: SharedTaskView[];
}

export function StorylineProgressView({ sharedTasks }: StorylineProgressViewProps) {
  const groups = Object.values(
    sharedTasks.reduce<Record<string, { storyline: string; maps: Set<string>; total: number; completed: number; percentSum: number; blocked: number }>>((acc, task) => {
      const entry = acc[task.storyline] ?? {
        storyline: task.storyline,
        maps: new Set<string>(),
        total: 0,
        completed: 0,
        percentSum: 0,
        blocked: 0,
      };

      entry.total += 1;
      entry.maps.add(task.map);
      entry.percentSum += task.progress.percent_complete;
      if (task.progress.status === 'done') {
        entry.completed += 1;
      }
      if (task.progress.status === 'blocked') {
        entry.blocked += 1;
      }

      acc[task.storyline] = entry;
      return acc;
    }, {}),
  ).map((group) => ({
    ...group,
    maps: [...group.maps].sort(),
    completion: group.total === 0 ? 0 : Math.round(group.percentSum / group.total),
  }));

  const dependencyItems = sharedTasks
    .filter((task) => task.dependencies_json.length > 0)
    .map((task) => ({
      id: task.id,
      title: task.title,
      dependencies: task.dependencies_json
        .map((dependencyId) => sharedTasks.find((candidate) => candidate.id === dependencyId)?.title ?? dependencyId),
    }));

  const mapBreakdown = Object.entries(
    sharedTasks.reduce<Record<string, { total: number; complete: number }>>((acc, task) => {
      const entry = acc[task.map] ?? { total: 0, complete: 0 };
      entry.total += 1;
      if (task.progress.status === 'done') {
        entry.complete += 1;
      }
      acc[task.map] = entry;
      return acc;
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right));

  return (
    <section className="details-section details-section--standalone">
      <div className="section-heading">
        <h2>STORYLINE PROGRESS</h2>
        <p>{groups.length} storyline tracks</p>
      </div>

      <div className="storyline-grid">
        {groups.map((group) => (
          <article key={group.storyline} className="task-card storyline-card">
            <div className="storyline-card__header">
              <div>
                <p className="task-card__eyebrow">STORYLINE</p>
                <h3>{group.storyline}</h3>
              </div>
              <strong>{group.completion}%</strong>
            </div>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${group.completion}%` }} />
            </div>
            <dl className="storyline-stats">
              <div>
                <dt>Total tasks</dt>
                <dd>{group.total}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{group.completed}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{group.blocked}</dd>
              </div>
            </dl>
            <div>
              <p className="meta-label">Maps covered</p>
              <p>{group.maps.join(', ')}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="analysis-grid">
        <article className="panel analysis-panel">
          <div className="section-heading section-heading--compact">
            <h2>MAP BREAKDOWN</h2>
            <p>Completion by area</p>
          </div>
          <div className="map-breakdown-list">
            {mapBreakdown.map(([map, summary]) => {
              const percent = summary.total === 0 ? 0 : Math.round((summary.complete / summary.total) * 100);
              return (
                <div key={map} className="metric-row">
                  <div>
                    <strong>{map}</strong>
                    <p>{summary.complete} / {summary.total} completed</p>
                  </div>
                  <span>{percent}%</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel analysis-panel">
          <div className="section-heading section-heading--compact">
            <h2>DEPENDENCY CHAIN</h2>
            <p>Tasks with prerequisites</p>
          </div>
          <div className="dependency-list">
            {dependencyItems.length === 0 ? (
              <p className="empty-state">No dependency chains are defined for the current task set.</p>
            ) : (
              dependencyItems.map((item) => (
                <div key={item.id} className="dependency-item">
                  <strong>{item.title}</strong>
                  <p>{item.dependencies.join(' → ')}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
