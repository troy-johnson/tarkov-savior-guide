import { useCallback, useEffect, useMemo, useState } from 'react';
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
const DEFAULT_RUN_ID = 'shared-savior-run';
const DEFAULT_RUN_NAME = 'Shared Savior Run';
const DEFAULT_MAP = 'Ground Zero';

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
  const [mapTelemetryByMap, setMapTelemetryByMap] = useState<Record<string, MapTelemetryRecord>>(seedMapTelemetry);
  const [bossIntelByMap, setBossIntelByMap] = useState<Record<string, BossIntelRecord>>(seedBossIntelByMap);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<'supabase' | 'local-seed'>(isSupabaseConfigured ? 'supabase' : 'local-seed');
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const hydrateDefaults = useCallback((stepList: QuestStepDefinition[], runId: string, rows: StepProgressRecord[] = []) => {
    setProgressByStep(
      Object.fromEntries(
        stepList.map((step) => {
          const persisted = rows.find((row) => row.step_id === step.id);
          return [step.id, persisted ?? createDefaultProgress(runId, step.id)];
        }),
      ),
    );
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      if (!client) {
        hydrateDefaults(seedQuestSteps, run.id);
        setMapTelemetryByMap(seedMapTelemetry);
        setBossIntelByMap(seedBossIntelByMap);
        setLoading(false);
        return;
      }

      try {
        const [
          { data: questRows, error: questError },
          { data: stepRows, error: stepError },
          { data: runRow, error: runError },
          { data: progressRows, error: progressError },
          { data: telemetryRows, error: telemetryError },
          { data: bossRows, error: bossError },
        ] = await Promise.all([
          client.from('story_quests').select('*').order('sort_order', { ascending: true }),
          client.from('quest_steps').select('*').order('sort_order', { ascending: true }),
          client.from('runs').select('*').eq('id', run.id).maybeSingle(),
          client.from('step_progress').select('*').eq('run_id', run.id),
          client.from('map_telemetry').select('*'),
          client.from('boss_intel').select('*'),
        ]);

        if (questError || stepError || runError || progressError || telemetryError || bossError) {
          throw questError ?? stepError ?? runError ?? progressError ?? telemetryError ?? bossError;
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

        if ((questRows ?? []).length === 0) {
          const { error: seedQuestError } = await client.from('story_quests').upsert(seedStoryQuests as never);
          if (seedQuestError) {
            throw seedQuestError;
          }
        }

        if ((stepRows ?? []).length === 0) {
          const { error: seedStepError } = await client.from('quest_steps').upsert(seedQuestSteps as never);
          if (seedStepError) {
            throw seedStepError;
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

        hydrateDefaults(resolvedSteps, run.id, progressRows ?? []);
        setSyncMode('supabase');
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load shared progress');
        setQuests(seedStoryQuests);
        setSteps(seedQuestSteps);
        setMapTelemetryByMap(seedMapTelemetry);
        setBossIntelByMap(seedBossIntelByMap);
        hydrateDefaults(seedQuestSteps, run.id);
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

    const stepProgressChannel = client
      .channel(`step_progress:${run.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'step_progress', filter: `run_id=eq.${run.id}` }, (payload) => {
        const next = payload.new as StepProgressRecord;
        if (!next?.step_id) {
          return;
        }
        setProgressByStep((current) => ({ ...current, [next.step_id]: next }));
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
      const current = progressByStep[stepId] ?? createDefaultProgress(run.id, stepId);
      const next = { ...current, ...changes, updated_at: new Date().toISOString() };

      setProgressByStep((existing) => ({ ...existing, [stepId]: next }));

      if (!client) {
        return;
      }

      setError(null);
      const { data: savedProgress, error: upsertError } = await client
        .from('step_progress')
        .upsert(next as never, { onConflict: 'run_id,step_id' })
        .select()
        .single();

      if (upsertError) {
        setProgressByStep((existing) => ({ ...existing, [stepId]: current }));
        setError(upsertError.message);
        return;
      }

      if (savedProgress) {
        setProgressByStep((existing) => ({ ...existing, [stepId]: savedProgress }));
      }
    },
    [client, progressByStep, run.id],
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
    loading,
    mapTelemetry,
    nextNonRaidSteps,
    priorityMap,
    prioritySteps,
    refresh,
    run,
    schemaSql,
    selectRun,
    setStatus,
    storyQuests,
    syncMode,
    updateStep,
  };
}
