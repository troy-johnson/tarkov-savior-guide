import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedTasks } from '../data/tasks';
import { getSupabaseClient, isSupabaseConfigured, schemaSql } from '../lib/supabase';
import type { RunRecord, SharedTaskView, TaskDefinition, TaskProgressRecord, TaskStatus } from '../types';

const STORAGE_KEY = 'tarkov-savior-guide-run';
const DEFAULT_RUN_ID = 'shared-savior-run';
const DEFAULT_RUN_NAME = 'Shared Savior Run';

const createDefaultProgress = (runId: string, taskId: string): TaskProgressRecord => ({
  run_id: runId,
  task_id: taskId,
  status: 'not_started',
  percent_complete: 0,
  current_note: '',
  updated_at: new Date().toISOString(),
});

const readLocalRunId = () => (typeof window === 'undefined' ? DEFAULT_RUN_ID : window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_RUN_ID);
const writeLocalRunId = (runId: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, runId);
  }
};

export function useSharedProgress() {
  const client = getSupabaseClient();
  const [run, setRun] = useState<RunRecord>({
    id: readLocalRunId(),
    name: DEFAULT_RUN_NAME,
    created_at: new Date().toISOString(),
  });
  const [tasks, setTasks] = useState<TaskDefinition[]>(seedTasks);
  const [progressByTask, setProgressByTask] = useState<Record<string, TaskProgressRecord>>({});
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<'supabase' | 'local-seed'>(isSupabaseConfigured ? 'supabase' : 'local-seed');
  const [error, setError] = useState<string | null>(null);

  const hydrateDefaults = useCallback((taskList: TaskDefinition[], runId: string, rows: TaskProgressRecord[] = []) => {
    const nextProgress = Object.fromEntries(
      taskList.map((task) => {
        const persisted = rows.find((row) => row.task_id === task.id);
        return [task.id, persisted ?? createDefaultProgress(runId, task.id)];
      }),
    );
    setProgressByTask(nextProgress);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      if (!client) {
        hydrateDefaults(seedTasks, run.id);
        setLoading(false);
        return;
      }

      try {
        const [{ data: taskRows, error: taskError }, { data: runRows, error: runError }, { data: progressRows, error: progressError }] = await Promise.all([
          client.from('tasks').select('*').order('sort_order', { ascending: true }),
          client.from('runs').select('*').eq('id', run.id).maybeSingle(),
          client.from('task_progress').select('*').eq('run_id', run.id),
        ]);

        if (taskError || runError || progressError) {
          throw taskError ?? runError ?? progressError;
        }

        const resolvedTasks = taskRows && taskRows.length > 0 ? taskRows : seedTasks;
        if (!active) {
          return;
        }

        setTasks(resolvedTasks);

        if (!runRows) {
          const insertedRun: RunRecord = { id: run.id, name: run.name, created_at: new Date().toISOString() };
          const { error: insertRunError } = await client.from('runs').upsert(insertedRun);
          if (insertRunError) {
            throw insertRunError;
          }
        } else {
          setRun(runRows);
        }

        hydrateDefaults(resolvedTasks, run.id, progressRows ?? []);
        setSyncMode('supabase');
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load shared progress');
        setTasks(seedTasks);
        hydrateDefaults(seedTasks, run.id);
        setSyncMode('local-seed');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [client, hydrateDefaults, run.id, run.name]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const channel = client
      .channel(`task_progress:${run.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_progress', filter: `run_id=eq.${run.id}` },
        (payload) => {
          const next = payload.new as TaskProgressRecord;
          if (!next?.task_id) {
            return;
          }
          setProgressByTask((current) => ({
            ...current,
            [next.task_id]: next,
          }));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, run.id]);

  const updateTask = useCallback(
    async (taskId: string, changes: Partial<Pick<TaskProgressRecord, 'status' | 'percent_complete' | 'current_note'>>) => {
      const current = progressByTask[taskId] ?? createDefaultProgress(run.id, taskId);
      const next: TaskProgressRecord = {
        ...current,
        ...changes,
        updated_at: new Date().toISOString(),
      };

      setProgressByTask((existing) => ({
        ...existing,
        [taskId]: next,
      }));

      if (!client) {
        return;
      }

      const { error: upsertError } = await client.from('task_progress').upsert(next);
      if (upsertError) {
        setError(upsertError.message);
      }
    },
    [client, progressByTask, run.id],
  );

  const selectRun = useCallback(async (runId: string, runName?: string) => {
    const trimmed = runId.trim() || DEFAULT_RUN_ID;
    writeLocalRunId(trimmed);
    setRun({
      id: trimmed,
      name: runName?.trim() || DEFAULT_RUN_NAME,
      created_at: new Date().toISOString(),
    });
  }, []);

  const sharedTasks = useMemo<SharedTaskView[]>(() => {
    return [...tasks]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((task) => ({
        ...task,
        progress: progressByTask[task.id] ?? createDefaultProgress(run.id, task.id),
      }));
  }, [progressByTask, run.id, tasks]);

  const completion = useMemo(() => {
    if (sharedTasks.length === 0) {
      return 0;
    }
    return Math.round(
      sharedTasks.reduce((sum, task) => sum + task.progress.percent_complete, 0) / sharedTasks.length,
    );
  }, [sharedTasks]);

  const setStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      const percent_complete = status === 'done' ? 100 : progressByTask[taskId]?.percent_complete ?? 0;
      await updateTask(taskId, { status, percent_complete });
    },
    [progressByTask, updateTask],
  );

  return {
    completion,
    error,
    loading,
    run,
    schemaSql,
    selectRun,
    setStatus,
    sharedTasks,
    syncMode,
    updateTask,
  };
}
