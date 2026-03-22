import { useCallback, useEffect, useMemo, useState } from 'react';
import { seedTasks } from '../data/tasks';
import { seedBossIntelByMap, seedMapTelemetry } from '../components/dashboard/dashboardData';
import { getSupabaseClient, isSupabaseConfigured, schemaSql } from '../lib/supabase';
import type {
  BossIntelRecord,
  MapTelemetryRecord,
  RunRecord,
  SharedTaskView,
  TaskDefinition,
  TaskProgressRecord,
  TaskStatus,
} from '../types';

const STORAGE_KEY = 'tarkov-savior-guide-run';
const DEFAULT_RUN_ID = 'shared-savior-run';
const DEFAULT_RUN_NAME = 'Shared Savior Run';
const DEFAULT_MAP = 'Labs';

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

const mapTelemetrySeedRows = Object.values(seedMapTelemetry);
const bossIntelSeedRows = Object.values(seedBossIntelByMap);

const toRecordByMap = <T extends { map: string }>(rows: T[]) => Object.fromEntries(rows.map((row) => [row.map, row]));

export function useSharedProgress() {
  const client = getSupabaseClient();
  const [run, setRun] = useState<RunRecord>({
    id: readLocalRunId(),
    name: DEFAULT_RUN_NAME,
    created_at: new Date().toISOString(),
  });
  const [tasks, setTasks] = useState<TaskDefinition[]>(seedTasks);
  const [progressByTask, setProgressByTask] = useState<Record<string, TaskProgressRecord>>({});
  const [mapTelemetryByMap, setMapTelemetryByMap] = useState<Record<string, MapTelemetryRecord>>(seedMapTelemetry);
  const [bossIntelByMap, setBossIntelByMap] = useState<Record<string, BossIntelRecord>>(seedBossIntelByMap);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<'supabase' | 'local-seed'>(isSupabaseConfigured ? 'supabase' : 'local-seed');
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
        setMapTelemetryByMap(seedMapTelemetry);
        setBossIntelByMap(seedBossIntelByMap);
        setLoading(false);
        return;
      }

      try {
        const [
          { data: taskRows, error: taskError },
          { data: runRows, error: runError },
          { data: progressRows, error: progressError },
          { data: telemetryRows, error: telemetryError },
          { data: bossRows, error: bossError },
        ] = await Promise.all([
          client.from('tasks').select('*').order('sort_order', { ascending: true }),
          client.from('runs').select('*').eq('id', run.id).maybeSingle(),
          client.from('task_progress').select('*').eq('run_id', run.id),
          client.from('map_telemetry').select('*'),
          client.from('boss_intel').select('*'),
        ]);

        if (taskError || runError || progressError || telemetryError || bossError) {
          throw taskError ?? runError ?? progressError ?? telemetryError ?? bossError;
        }

        const shouldSeedTasks = (taskRows ?? []).length === 0;
        const resolvedTasks = shouldSeedTasks ? seedTasks : taskRows ?? seedTasks;
        const resolvedTelemetry = telemetryRows && telemetryRows.length > 0 ? toRecordByMap(telemetryRows) : seedMapTelemetry;
        const resolvedBossIntel = bossRows && bossRows.length > 0 ? toRecordByMap(bossRows) : seedBossIntelByMap;

        if (!active) {
          return;
        }

        setTasks(resolvedTasks);
        setMapTelemetryByMap(resolvedTelemetry);
        setBossIntelByMap(resolvedBossIntel);

        if (!runRows) {
          const insertedRun: RunRecord = { id: run.id, name: run.name, created_at: new Date().toISOString() };
          const { error: insertRunError } = await client.from('runs').upsert(insertedRun as never);
          if (insertRunError) {
            throw insertRunError;
          }
        } else {
          setRun(runRows);
        }

        if (shouldSeedTasks) {
          const { error: taskUpsertError } = await client.from('tasks').upsert(seedTasks as never);
          if (taskUpsertError) {
            throw taskUpsertError;
          }
        }

        if ((telemetryRows ?? []).length === 0) {
          const { error: telemetryUpsertError } = await client.from('map_telemetry').upsert(mapTelemetrySeedRows as never);
          if (telemetryUpsertError) {
            throw telemetryUpsertError;
          }
        }

        if ((bossRows ?? []).length === 0) {
          const { error: bossUpsertError } = await client.from('boss_intel').upsert(bossIntelSeedRows as never);
          if (bossUpsertError) {
            throw bossUpsertError;
          }
        }

        hydrateDefaults(resolvedTasks, run.id, progressRows ?? []);
        setSyncMode('supabase');
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load shared progress');
        setTasks(seedTasks);
        setMapTelemetryByMap(seedMapTelemetry);
        setBossIntelByMap(seedBossIntelByMap);
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
  }, [client, hydrateDefaults, reloadToken, run.id, run.name]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const taskProgressChannel = client
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

    const mapTelemetryChannel = client
      .channel('map_telemetry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_telemetry' }, (payload) => {
        const next = payload.new as MapTelemetryRecord;
        if (!next?.map) {
          return;
        }
        setMapTelemetryByMap((current) => ({
          ...current,
          [next.map]: next,
        }));
      })
      .subscribe();

    const bossIntelChannel = client
      .channel('boss_intel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boss_intel' }, (payload) => {
        const next = payload.new as BossIntelRecord;
        if (!next?.map) {
          return;
        }
        setBossIntelByMap((current) => ({
          ...current,
          [next.map]: next,
        }));
      })
      .subscribe();

    return () => {
      void client.removeChannel(taskProgressChannel);
      void client.removeChannel(mapTelemetryChannel);
      void client.removeChannel(bossIntelChannel);
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

      const { error: upsertError } = await client.from('task_progress').upsert(next as never);
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

  const refresh = useCallback(async () => {
    setReloadToken((current) => current + 1);
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
    return Math.round(sharedTasks.reduce((sum, task) => sum + task.progress.percent_complete, 0) / sharedTasks.length);
  }, [sharedTasks]);

  const setStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      const percent_complete = status === 'done' ? 100 : progressByTask[taskId]?.percent_complete ?? 0;
      await updateTask(taskId, { status, percent_complete });
    },
    [progressByTask, updateTask],
  );

  const activeMap = sharedTasks.find((task) => task.progress.status !== 'done')?.map ?? sharedTasks[0]?.map ?? DEFAULT_MAP;
  const mapTelemetry = mapTelemetryByMap[activeMap] ?? mapTelemetryByMap[DEFAULT_MAP] ?? mapTelemetrySeedRows[0];
  const bossIntel = bossIntelByMap[activeMap] ?? bossIntelByMap[DEFAULT_MAP] ?? bossIntelSeedRows[0];

  return {
    bossIntel,
    completion,
    error,
    loading,
    mapTelemetry,
    refresh,
    run,
    schemaSql,
    selectRun,
    setStatus,
    sharedTasks,
    syncMode,
    updateTask,
  };
}
