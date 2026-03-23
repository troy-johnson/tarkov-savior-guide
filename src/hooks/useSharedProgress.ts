import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { seedBossIntelByMap, seedMapTelemetry, realRaidMaps } from '../components/dashboard/dashboardData';
import { seedQuestSteps, seedStoryQuests } from '../data/tasks';
import { getSupabaseClient, isSupabaseConfigured, schemaSql } from '../lib/supabase';
import type {
  BossIntelRecord,
  MapTelemetryRecord,
  QuestStepDefinition,
  RunRecord,
  StepProgressRecord,
  StepStatus,
  StepView,
  StoryQuestDefinition,
  StoryQuestView,
} from '../types';

const STORAGE_KEY = 'tarkov-savior-guide-run';
const STORAGE_PROGRESS_PREFIX = 'tarkov-savior-guide-progress:';
const STORAGE_PROGRESS_META_PREFIX = 'tarkov-savior-guide-progress-meta:';
const DEFAULT_RUN_ID = 'shared-savior-run';
const DEFAULT_RUN_NAME = 'Shared Savior Run';
const DEFAULT_MAP = 'Ground Zero';

type RemoteHealth = 'connected' | 'degraded' | 'offline';

const createDefaultProgress = (runId: string, stepId: string): StepProgressRecord => ({
  run_id: runId,
  step_id: stepId,
  status: 'not_started',
  current_note: '',
  updated_at: new Date().toISOString(),
});

const readLocalRunId = () => (typeof window === 'undefined' ? DEFAULT_RUN_ID : window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_RUN_ID);
const writeLocalRunId = (runId: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, runId);
  }
};

function readLocalProgress(runId: string): StepProgressRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(getLocalProgressKey(runId));
  if (!raw) {
    return [];
  }

  try {
    const parsed: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type LocalProgressMetadata = {
  last_local_write_at: string;
  unsynced: boolean;
  dirty_step_ids?: string[];
};

const getLocalProgressKey = (runId: string) => `${STORAGE_PROGRESS_PREFIX}${runId}`;
const getLocalProgressMetadataKey = (runId: string) => `${STORAGE_PROGRESS_META_PREFIX}${runId}`;

function readLocalProgressMetadata(runId: string): LocalProgressMetadata | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(getLocalProgressMetadataKey(runId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      last_local_write_at:
        typeof parsed.last_local_write_at === 'string' ? parsed.last_local_write_at : new Date().toISOString(),
      unsynced: parsed.unsynced === true,
      dirty_step_ids: Array.isArray(parsed.dirty_step_ids)
        ? (parsed.dirty_step_ids as unknown[]).filter((stepId): stepId is string => typeof stepId === 'string')
        : undefined,
    } satisfies LocalProgressMetadata;
  } catch {
    return null;
  }
}

function writeLocalProgressMetadata(runId: string, metadata: LocalProgressMetadata) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getLocalProgressMetadataKey(runId), JSON.stringify(metadata));
}

function clearLocalProgressMetadata(runId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getLocalProgressMetadataKey(runId));
}

function writeLocalProgress(
  runId: string,
  progressByStep: Record<string, StepProgressRecord>,
  options?: { unsynced?: boolean; dirtyStepIds?: string[] },
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getLocalProgressKey(runId), JSON.stringify(Object.values(progressByStep)));

  const existingMetadata = readLocalProgressMetadata(runId);
  const dirtyStepIds = options?.unsynced
    ? [...new Set([...(existingMetadata?.dirty_step_ids ?? []), ...(options.dirtyStepIds ?? [])])]
    : options?.dirtyStepIds?.length
      ? [...new Set(options.dirtyStepIds)]
      : undefined;

  const nextMetadata: LocalProgressMetadata = {
    last_local_write_at: new Date().toISOString(),
    unsynced: options?.unsynced ?? false,
    dirty_step_ids: dirtyStepIds?.length ? dirtyStepIds : undefined,
  };

  if (!nextMetadata.unsynced && !nextMetadata.dirty_step_ids?.length) {
    clearLocalProgressMetadata(runId);
    return;
  }

  writeLocalProgressMetadata(runId, nextMetadata);
}

const mapTelemetrySeedRows = Object.values(seedMapTelemetry);
const bossIntelSeedRows = Object.values(seedBossIntelByMap);
const toRecordByMap = <T extends { map: string }>(rows: T[]) => Object.fromEntries(rows.map((row) => [row.map, row]));

function getQuestActiveSortOrder(steps: StepView[]) {
  const nextRequired = steps.find((step) => step.is_required && step.progress.status !== 'done');
  return nextRequired?.sort_order;
}

function hydrateQuestViews(
  quests: StoryQuestDefinition[],
  steps: QuestStepDefinition[],
  progressByStep: Record<string, StepProgressRecord>,
  runId: string,
): { storyQuests: StoryQuestView[]; allSteps: StepView[] } {
  const questById = Object.fromEntries(quests.map((quest) => [quest.id, quest]));

  const stepsWithQuest = [...steps]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((step) => ({
      ...step,
      quest: questById[step.quest_id],
      progress: progressByStep[step.id] ?? createDefaultProgress(runId, step.id),
      isActive: false,
      isComplete: (progressByStep[step.id] ?? createDefaultProgress(runId, step.id)).status === 'done',
    } satisfies StepView));

  const stepsByQuest = stepsWithQuest.reduce<Record<string, StepView[]>>((acc, step) => {
    acc[step.quest_id] ??= [];
    acc[step.quest_id].push(step);
    return acc;
  }, {});

  const storyQuests = quests
    .map((quest) => {
      const questSteps = (stepsByQuest[quest.id] ?? []).sort((left, right) => left.sort_order - right.sort_order);
      const activeSortOrder = getQuestActiveSortOrder(questSteps);
      const activeSteps = questSteps.filter((step) => step.progress.status !== 'done' && step.sort_order === activeSortOrder);
      activeSteps.forEach((step) => {
        step.isActive = true;
      });
      const requiredSteps = questSteps.filter((step) => step.is_required).length;
      const completedSteps = questSteps.filter((step) => step.is_required && step.progress.status === 'done').length;
      return {
        ...quest,
        steps: questSteps,
        activeSteps,
        completedSteps,
        requiredSteps,
        isComplete: requiredSteps > 0 && completedSteps === requiredSteps,
      } satisfies StoryQuestView;
    })
    .sort((left, right) => left.sort_order - right.sort_order);

  return { storyQuests, allSteps: storyQuests.flatMap((quest) => quest.steps) };
}

export function useSharedProgress() {
  const client = getSupabaseClient();
  const [run, setRun] = useState<RunRecord>({ id: readLocalRunId(), name: DEFAULT_RUN_NAME, created_at: new Date().toISOString() });
  const [quests, setQuests] = useState<StoryQuestDefinition[]>(seedStoryQuests);
  const [steps, setSteps] = useState<QuestStepDefinition[]>(seedQuestSteps);
  const [progressByStep, setProgressByStep] = useState<Record<string, StepProgressRecord>>({});
  const progressByStepRef = useRef<Record<string, StepProgressRecord>>({});
  const runIdRef = useRef(run.id);
  const syncModeRef = useRef<'supabase' | 'local-seed'>(isSupabaseConfigured ? 'supabase' : 'local-seed');
  const [mapTelemetryByMap, setMapTelemetryByMap] = useState<Record<string, MapTelemetryRecord>>(seedMapTelemetry);
  const [bossIntelByMap, setBossIntelByMap] = useState<Record<string, BossIntelRecord>>(seedBossIntelByMap);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncMode, setSyncMode] = useState<'supabase' | 'local-seed'>(isSupabaseConfigured ? 'supabase' : 'local-seed');
  const [remoteHealth, setRemoteHealth] = useState<RemoteHealth>(client ? 'connected' : 'offline');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  runIdRef.current = run.id;
  syncModeRef.current = syncMode;

  const logRemoteCheckpoint = useCallback((operation: string, details?: { error?: unknown; message?: string }) => {
    console.log('[shared-progress]', {
      runId: runIdRef.current,
      isSupabaseConfigured,
      syncMode: syncModeRef.current,
      operation,
      error: details?.error ?? details?.message ?? null,
    });
  }, []);

  const logRemoteFailure = useCallback((operation: string, details?: { error?: unknown; message?: string }) => {
    console.error('[shared-progress]', {
      runId: runIdRef.current,
      isSupabaseConfigured,
      syncMode: syncModeRef.current,
      operation,
      error: details?.error ?? details?.message ?? null,
    });
  }, []);

  const reconcileLocalProgress = useCallback(async (runId: string, remoteRows: StepProgressRecord[]) => {
    if (!client) {
      return remoteRows;
    }

    const localMetadata = readLocalProgressMetadata(runId);
    if (!localMetadata?.unsynced) {
      return remoteRows;
    }

    const localRows = readLocalProgress(runId);
    if (localRows.length === 0) {
      clearLocalProgressMetadata(runId);
      return remoteRows;
    }

    const remoteByStepId = Object.fromEntries(remoteRows.map((row) => [row.step_id, row]));
    const dirtyStepIds = localMetadata.dirty_step_ids?.length
      ? new Set(localMetadata.dirty_step_ids)
      : new Set(localRows.map((row) => row.step_id));

    const rowsToReplay = localRows.filter((localRow) => {
      if (localRow.run_id !== runId || !dirtyStepIds.has(localRow.step_id)) {
        return false;
      }

      const remoteRow = remoteByStepId[localRow.step_id];
      if (!remoteRow) {
        return true;
      }

      return new Date(localRow.updated_at).getTime() > new Date(remoteRow.updated_at).getTime();
    });

    if (rowsToReplay.length === 0) {
      clearLocalProgressMetadata(runId);
      return remoteRows;
    }

    for (const row of rowsToReplay) {
      console.log('[shared-progress]', {
        runId,
        operation: 'load:reconcile-local-progress:replay-row',
        stepId: row.step_id,
        updatedAt: row.updated_at,
      });
    }

    const { data: reconciledRowsRaw, error: reconcileError } = await client
      .from('step_progress')
      .upsert(rowsToReplay as never, { onConflict: 'run_id,step_id' })
      .select();

    if (reconcileError) {
      logRemoteFailure('load:reconcile-local-progress:error', { error: reconcileError });
      throw reconcileError;
    }

    clearLocalProgressMetadata(runId);

    const reconciledRows = (reconciledRowsRaw ?? rowsToReplay) as StepProgressRecord[];
    const mergedByStepId: Record<string, StepProgressRecord> = Object.fromEntries(remoteRows.map((row) => [row.step_id, row]));
    for (const row of reconciledRows) {
      mergedByStepId[row.step_id] = row;
    }

    const mergedRows = Object.values(mergedByStepId).filter((row): row is StepProgressRecord => Boolean(row));
    writeLocalProgress(runId, Object.fromEntries(mergedRows.map((row) => [row.step_id, row])));
    return mergedRows;
  }, [client, logRemoteFailure]);

  const hydrateDefaults = useCallback((stepList: QuestStepDefinition[], runId: string, rows: StepProgressRecord[] = []) => {
    const hydrated = Object.fromEntries(
      stepList.map((step) => {
        const persisted = rows.find((row) => row.step_id === step.id);
        return [step.id, persisted ?? createDefaultProgress(runId, step.id)];
      }),
    );

    progressByStepRef.current = hydrated;
    setProgressByStep(hydrated);
  }, []);

  const logLocalFallback = useCallback((operation: string, reason: string, details?: { error?: unknown }) => {
    console.warn('[shared-progress:fallback]', {
      runId: runIdRef.current,
      operation,
      reason,
      syncMode: syncModeRef.current,
      remoteHealth,
      error: details?.error ?? null,
    });
  }, [remoteHealth]);

  const ensureRemoteRun = useCallback(async () => {
    // `runs` is only the parent identity/metadata record for a shared run.
    // Canonical per-step checklist state lives in `step_progress`.
    if (!client) {
      logRemoteFailure('ensureRemoteRun:client-null', { message: 'Supabase client unavailable' });
      return;
    }

    logRemoteCheckpoint('ensureRemoteRun:before');
    const { error: runError } = await client.from('runs').upsert({
      id: run.id,
      name: run.name,
    } as never, { onConflict: 'id' });

    if (runError) {
      logRemoteFailure('ensureRemoteRun:error', { error: runError });
      throw runError;
    }

    logRemoteCheckpoint('ensureRemoteRun:after');
  }, [client, logRemoteCheckpoint, logRemoteFailure, run.id, run.name]);

  useEffect(() => {
    let active = true;

    async function load() {
      logRemoteCheckpoint('load:start');
      setLoading(true);
      setError(null);

      if (!client) {
        logRemoteFailure('load:client-null', { message: 'Supabase client unavailable' });
        if (!active) {
          return;
        }
        hydrateDefaults(seedQuestSteps, run.id, readLocalProgress(run.id));
        setMapTelemetryByMap(seedMapTelemetry);
        setBossIntelByMap(seedBossIntelByMap);
        setSyncMode('local-seed');
        setRemoteHealth('offline');
        setLastSyncedAt(new Date().toISOString());
        setRefreshing(false);
        setLoading(false);
        return;
      }

      try {
        logRemoteCheckpoint('load:read-story_quests:before');
        const { data: questRows, error: questError } = await client.from('story_quests').select('*').order('sort_order', { ascending: true });
        if (questError) {
          logRemoteFailure('load:read-story_quests:error', { error: questError });
          throw questError;
        }
        logRemoteCheckpoint('load:read-story_quests:after');

        logRemoteCheckpoint('load:read-quest_steps:before');
        const { data: stepRows, error: stepError } = await client.from('quest_steps').select('*').order('sort_order', { ascending: true });
        if (stepError) {
          logRemoteFailure('load:read-quest_steps:error', { error: stepError });
          throw stepError;
        }
        logRemoteCheckpoint('load:read-quest_steps:after');

        logRemoteCheckpoint('load:read-runs:before');
        const { data: runRow, error: runError } = await client.from('runs').select('*').eq('id', run.id).maybeSingle();
        if (runError) {
          logRemoteFailure('load:read-runs:error', { error: runError });
          throw runError;
        }
        logRemoteCheckpoint('load:read-runs:after');

        logRemoteCheckpoint('load:read-step_progress:before');
        const { data: progressRows, error: progressError } = await client.from('step_progress').select('*').eq('run_id', run.id);
        if (progressError) {
          logRemoteFailure('load:read-step_progress:error', { error: progressError });
          throw progressError;
        }
        logRemoteCheckpoint('load:read-step_progress:after');

        const [
          { data: telemetryRows, error: telemetryError },
          { data: bossRows, error: bossError },
        ] = await Promise.all([
          client.from('map_telemetry').select('*'),
          client.from('boss_intel').select('*'),
        ]);

        if (telemetryError || bossError) {
          const remoteError = telemetryError ?? bossError;
          logRemoteFailure('load:read-dashboard:error', { error: remoteError });
          throw remoteError;
        }

        const resolvedQuests = (questRows ?? []).length > 0 ? questRows : seedStoryQuests;
        const resolvedSteps = (stepRows ?? []).length > 0 ? stepRows : seedQuestSteps;
        const resolvedTelemetry = telemetryRows && telemetryRows.length > 0 ? toRecordByMap(telemetryRows) : seedMapTelemetry;
        const resolvedBossIntel = bossRows && bossRows.length > 0 ? toRecordByMap(bossRows) : seedBossIntelByMap;

        if (!active) {
          return;
        }

        setQuests(resolvedQuests);
        setSteps(resolvedSteps);
        setMapTelemetryByMap(resolvedTelemetry);
        setBossIntelByMap(resolvedBossIntel);

        if (!runRow) {
          const insertedRun: RunRecord = { id: run.id, name: run.name, created_at: new Date().toISOString() };
          const { error: insertRunError } = await client.from('runs').upsert(insertedRun as never);
          if (insertRunError) {
            throw insertRunError;
          }
        } else {
          setRun(runRow);
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

        const reconciledProgressRows = await reconcileLocalProgress(run.id, progressRows ?? []);
        hydrateDefaults(resolvedSteps, run.id, reconciledProgressRows);
        setSyncMode('supabase');
        setRemoteHealth('connected');
        setLastSyncedAt(new Date().toISOString());
      } catch (loadError) {
        if (!active) {
          return;
        }
        logRemoteFailure('load:local-seed-fallback', { error: loadError });
        setError(loadError instanceof Error ? loadError.message : 'Unable to load shared progress');
        setQuests(seedStoryQuests);
        setSteps(seedQuestSteps);
        setMapTelemetryByMap(seedMapTelemetry);
        setBossIntelByMap(seedBossIntelByMap);
        hydrateDefaults(seedQuestSteps, run.id, readLocalProgress(run.id));
        setSyncMode('local-seed');
        setRemoteHealth(client ? 'degraded' : 'offline');
        setLastSyncedAt(new Date().toISOString());
      } finally {
        if (active) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [client, hydrateDefaults, reconcileLocalProgress, reloadToken, run.id, run.name]);

  useEffect(() => {
    if (!client) {
      return;
    }

    const stepProgressChannel = client
      .channel(`step_progress:${run.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'step_progress', filter: `run_id=eq.${run.id}` }, (payload) => {
        logRemoteCheckpoint('realtime:step_progress:event', { message: payload.eventType });
        const next = payload.new as StepProgressRecord;
        if (!next?.step_id) {
          return;
        }
        setProgressByStep((current) => {
          const updated = { ...current, [next.step_id]: next };
          progressByStepRef.current = updated;
          writeLocalProgress(run.id, updated);
          return updated;
        });
      })
      .subscribe();

    const mapTelemetryChannel = client
      .channel('map_telemetry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'map_telemetry' }, (payload) => {
        const next = payload.new as MapTelemetryRecord;
        if (!next?.map) {
          return;
        }
        setMapTelemetryByMap((current) => ({ ...current, [next.map]: next }));
      })
      .subscribe();

    const bossIntelChannel = client
      .channel('boss_intel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boss_intel' }, (payload) => {
        const next = payload.new as BossIntelRecord;
        if (!next?.map) {
          return;
        }
        setBossIntelByMap((current) => ({ ...current, [next.map]: next }));
      })
      .subscribe();

    return () => {
      void client.removeChannel(stepProgressChannel);
      void client.removeChannel(mapTelemetryChannel);
      void client.removeChannel(bossIntelChannel);
    };
  }, [client, run.id]);

  const updateStep = useCallback(
    async (stepId: string, changes: Partial<Pick<StepProgressRecord, 'status' | 'current_note'>>) => {
      // Persist checklist state by `(run_id, step_id)` in `step_progress`.
      // localStorage is only a client-side fallback/cache for the same rows.
      const currentProgressByStep = progressByStepRef.current;
      const current = currentProgressByStep[stepId] ?? createDefaultProgress(run.id, stepId);
      const next = { ...current, ...changes, updated_at: new Date().toISOString() };
      const nextProgressByStep = { ...currentProgressByStep, [stepId]: next };

      progressByStepRef.current = nextProgressByStep;
      setProgressByStep(nextProgressByStep);

      const persistLocalFallback = (reason: string, details?: { error?: unknown }) => {
        logLocalFallback('updateStep', reason, details);
        writeLocalProgress(run.id, nextProgressByStep);
      };

      if (!client) {
        logRemoteFailure('updateStep:client-null', { message: 'Supabase client unavailable' });
        setRemoteHealth('offline');
        setSyncMode('local-seed');
        persistLocalFallback('Supabase client unavailable');
        return;
      }

      if (remoteHealth !== 'connected') {
        setSyncMode('local-seed');
        persistLocalFallback(`Remote health is ${remoteHealth}`);
        return;
      }

      setError(null);
      try {
        await ensureRemoteRun();
      } catch (runError) {
        logRemoteFailure('updateStep:ensureRemoteRun:local-seed-fallback', { error: runError });
        setRemoteHealth('degraded');
        setSyncMode('local-seed');
        setError(runError instanceof Error ? runError.message : 'Unable to prepare run for sync');
        persistLocalFallback('Failed to ensure remote run', { error: runError });
        return;
      }

      logRemoteCheckpoint('updateStep:upsert-step_progress:before');
      const { data: savedProgress, error: upsertError } = await client
        .from('step_progress')
        .upsert(next as never, { onConflict: 'run_id,step_id' })
        .select()
        .single();

      if (upsertError) {
        logRemoteFailure('updateStep:upsert-step_progress:local-seed-fallback', { error: upsertError });
        setRemoteHealth('degraded');
        setSyncMode('local-seed');
        setError(upsertError.message);
        persistLocalFallback('Remote step_progress upsert failed', { error: upsertError });
        return;
      }

      logRemoteCheckpoint('updateStep:upsert-step_progress:after');

      if (savedProgress) {
        const savedProgressByStep = { ...nextProgressByStep, [stepId]: savedProgress };
        progressByStepRef.current = savedProgressByStep;
        setProgressByStep(savedProgressByStep);
        setRemoteHealth('connected');
        setSyncMode('supabase');
        setLastSyncedAt(new Date().toISOString());
      }
    },
    [client, ensureRemoteRun, logLocalFallback, remoteHealth, run.id],
  );

  const setStatus = useCallback(async (stepId: string, status: StepStatus) => {
    await updateStep(stepId, { status });
  }, [updateStep]);

  const selectRun = useCallback(async (runId: string, runName?: string) => {
    const trimmed = runId.trim() || DEFAULT_RUN_ID;
    writeLocalRunId(trimmed);
    setRun({ id: trimmed, name: runName?.trim() || DEFAULT_RUN_NAME, created_at: new Date().toISOString() });
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setReloadToken((current) => current + 1);
  }, []);

  const { storyQuests, allSteps } = useMemo(() => hydrateQuestViews(quests, steps, progressByStep, run.id), [progressByStep, quests, run.id, steps]);

  const activeSteps = useMemo(() => storyQuests.flatMap((quest) => quest.activeSteps), [storyQuests]);

  const activeMapBreakdown = useMemo(() => {
    const counts = activeSteps.reduce<Record<string, number>>((acc, step) => {
      if (!realRaidMaps.has(step.map)) {
        return acc;
      }
      acc[step.map] = (acc[step.map] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  }, [activeSteps]);

  const priorityMap = activeMapBreakdown[0]?.[0] ?? DEFAULT_MAP;
  const prioritySteps = activeSteps.filter((step) => step.map === priorityMap);
  const nextNonRaidSteps = activeSteps.filter((step) => !realRaidMaps.has(step.map));
  const mapTelemetry = mapTelemetryByMap[priorityMap] ?? mapTelemetryByMap[DEFAULT_MAP] ?? mapTelemetrySeedRows[0];
  const bossIntel = bossIntelByMap[priorityMap] ?? bossIntelByMap[DEFAULT_MAP] ?? bossIntelSeedRows[0];

  const completion = useMemo(() => {
    const requiredSteps = allSteps.filter((step) => step.is_required);
    if (requiredSteps.length === 0) {
      return 0;
    }
    const completed = requiredSteps.filter((step) => step.progress.status === 'done').length;
    return Math.round((completed / requiredSteps.length) * 100);
  }, [allSteps]);

  return {
    activeMapBreakdown,
    activeSteps,
    allSteps,
    bossIntel,
    completion,
    error,
    lastSyncedAt,
    loading,
    mapTelemetry,
    nextNonRaidSteps,
    priorityMap,
    prioritySteps,
    refresh,
    refreshing,
    run,
    schemaSql,
    selectRun,
    setStatus,
    storyQuests,
    remoteHealth,
    syncMode,
    updateStep,
  };
}
