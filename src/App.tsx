import { useMemo, useState } from 'react';
import { TaskCard } from './components/TaskCard';
import { useSharedProgress } from './hooks/useSharedProgress';

function App() {
  const { completion, error, loading, run, schemaSql, selectRun, setStatus, sharedTasks, syncMode, updateTask } = useSharedProgress();
  const [runInput, setRunInput] = useState(run.id);
  const groupedByMap = useMemo(() => {
    return sharedTasks.reduce<Record<string, typeof sharedTasks>>((groups, task) => {
      groups[task.map] = groups[task.map] ?? [];
      groups[task.map].push(task);
      return groups;
    }, {});
  }, [sharedTasks]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="hero__eyebrow">Tarkov Savior shared tracker</p>
          <h1>One run, two players, always-synced quest progress.</h1>
          <p className="hero__lede">
            Task definitions are loaded once, and shared progress updates stream in through Supabase realtime when configured.
            If environment keys are missing, the app falls back to a local seed so the UI still works during setup.
          </p>
        </div>
        <div className="hero__panel">
          <p><strong>Run ID:</strong> {run.id}</p>
          <p><strong>Sync mode:</strong> {syncMode}</p>
          <p><strong>Average completion:</strong> {completion}%</p>
          <label>
            Shared run link / invite code
            <div className="hero__inline-form">
              <input value={runInput} onChange={(event) => setRunInput(event.target.value)} placeholder="shared-savior-run" />
              <button type="button" onClick={() => void selectRun(runInput)}>Join run</button>
            </div>
          </label>
        </div>
      </section>

      {error ? <p className="banner banner--error">Realtime sync fallback: {error}</p> : null}
      {loading ? <p className="banner">Loading shared progress…</p> : null}

      <section className="schema-panel">
        <div>
          <h2>Suggested Supabase schema</h2>
          <p>Use the tables below in Supabase SQL editor, then set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</p>
        </div>
        <pre>{schemaSql}</pre>
      </section>

      {Object.entries(groupedByMap).map(([mapName, tasks]) => (
        <section key={mapName} className="task-group">
          <div className="task-group__header">
            <h2>{mapName}</h2>
            <p>{tasks.length} tasks</p>
          </div>
          <div className="task-grid">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={(taskId, status) => void setStatus(taskId, status)}
                onPercentChange={(taskId, percent) => void updateTask(taskId, { percent_complete: percent })}
                onNoteChange={(taskId, note) => void updateTask(taskId, { current_note: note, status: 'in_progress' })}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default App;
