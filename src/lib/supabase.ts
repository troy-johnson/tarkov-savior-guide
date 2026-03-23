import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { seedBossIntelByMap, seedMapTelemetry } from '../components/dashboard/dashboardData';
import { seedQuestSteps, seedStoryQuests } from '../data/tasks';
import type {
  BossIntelRecord,
  MapTelemetryRecord,
  QuestStepDefinition,
  RunRecord,
  StepProgressRecord,
  StoryQuestDefinition,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type AppDatabase = {
  public: {
    Tables: {
      boss_intel: {
        Row: BossIntelRecord;
        Insert: Omit<BossIntelRecord, 'updated_at'> & Partial<Pick<BossIntelRecord, 'updated_at'>>;
        Update: Partial<BossIntelRecord>;
        Relationships: [];
      };
      map_telemetry: {
        Row: MapTelemetryRecord;
        Insert: Omit<MapTelemetryRecord, 'updated_at'> & Partial<Pick<MapTelemetryRecord, 'updated_at'>>;
        Update: Partial<MapTelemetryRecord>;
        Relationships: [];
      };
      quest_steps: {
        Row: QuestStepDefinition;
        Insert: QuestStepDefinition;
        Update: Partial<QuestStepDefinition>;
        Relationships: [];
      };
      runs: {
        Row: RunRecord;
        Insert: Pick<RunRecord, 'id' | 'name'> & Partial<Pick<RunRecord, 'created_at'>>;
        Update: Partial<RunRecord>;
        Relationships: [];
      };
      step_progress: {
        Row: StepProgressRecord;
        Insert: StepProgressRecord;
        Update: Partial<StepProgressRecord>;
        Relationships: [];
      };
      story_quests: {
        Row: StoryQuestDefinition;
        Insert: StoryQuestDefinition;
        Update: Partial<StoryQuestDefinition>;
        Relationships: [];
      };
    };
  };
};

let cachedClient: SupabaseClient<AppDatabase> | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabaseClient(): SupabaseClient<AppDatabase> | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!cachedClient) {
    console.log('[shared-progress]', {
      operation: 'supabase:create-client',
      isSupabaseConfigured,
      urlConfigured: Boolean(supabaseUrl),
      anonKeyConfigured: Boolean(supabaseAnonKey),
      error: null,
    });
    cachedClient = createClient<AppDatabase>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    });
  }

  return cachedClient;
}

const escapeSqlString = (value: string) => value.replaceAll("'", "''");

const storyQuestSeedSql = seedStoryQuests
  .map(
    (quest) => `
insert into public.story_quests (id, title, storyline, sort_order, summary, source_urls)
values (
  '${escapeSqlString(quest.id)}',
  '${escapeSqlString(quest.title)}',
  '${escapeSqlString(quest.storyline)}',
  ${quest.sort_order},
  '${escapeSqlString(quest.summary)}',
  '${escapeSqlString(JSON.stringify(quest.source_urls))}'::jsonb
)
on conflict (id) do update set
  title = excluded.title,
  storyline = excluded.storyline,
  sort_order = excluded.sort_order,
  summary = excluded.summary,
  source_urls = excluded.source_urls;`,
  )
  .join('\n');

const questStepSeedSql = seedQuestSteps
  .map(
    (step) => `
insert into public.quest_steps (id, quest_id, sort_order, title, details, step_type, map, is_required)
values (
  '${escapeSqlString(step.id)}',
  '${escapeSqlString(step.quest_id)}',
  ${step.sort_order},
  '${escapeSqlString(step.title)}',
  '${escapeSqlString(step.details)}',
  '${escapeSqlString(step.step_type)}',
  '${escapeSqlString(step.map)}',
  ${step.is_required}
)
on conflict (id) do update set
  quest_id = excluded.quest_id,
  sort_order = excluded.sort_order,
  title = excluded.title,
  details = excluded.details,
  step_type = excluded.step_type,
  map = excluded.map,
  is_required = excluded.is_required;`,
  )
  .join('\n');

const mapTelemetrySeedSql = Object.values(seedMapTelemetry)
  .map(
    (row) => `
insert into public.map_telemetry (map, coordinates, sector, area_label, signal_status, updated_at)
values (
  '${escapeSqlString(row.map)}',
  '${escapeSqlString(row.coordinates)}',
  '${escapeSqlString(row.sector)}',
  '${escapeSqlString(row.area_label)}',
  '${escapeSqlString(row.signal_status)}',
  '${escapeSqlString(row.updated_at)}'
)
on conflict (map) do update set
  coordinates = excluded.coordinates,
  sector = excluded.sector,
  area_label = excluded.area_label,
  signal_status = excluded.signal_status,
  updated_at = excluded.updated_at;`,
  )
  .join('\n');

const bossIntelSeedSql = Object.values(seedBossIntelByMap)
  .map(
    (row) => `
insert into public.boss_intel (map, name, secondary, threat, spawn, activity, priority, updated_at)
values (
  '${escapeSqlString(row.map)}',
  '${escapeSqlString(row.name)}',
  '${escapeSqlString(row.secondary)}',
  '${escapeSqlString(row.threat)}',
  '${escapeSqlString(row.spawn)}',
  '${escapeSqlString(row.activity)}',
  '${escapeSqlString(row.priority)}',
  '${escapeSqlString(row.updated_at)}'
)
on conflict (map) do update set
  name = excluded.name,
  secondary = excluded.secondary,
  threat = excluded.threat,
  spawn = excluded.spawn,
  activity = excluded.activity,
  priority = excluded.priority,
  updated_at = excluded.updated_at;`,
  )
  .join('\n');

export const schemaSql = `
drop table if exists public.task_progress;
drop table if exists public.tasks;

create table if not exists public.runs (
  id text primary key,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.story_quests (
  id text primary key,
  title text not null,
  storyline text not null,
  sort_order integer not null,
  summary text not null,
  source_urls jsonb not null default '[]'::jsonb
);

create table if not exists public.quest_steps (
  id text primary key,
  quest_id text not null references public.story_quests(id) on delete cascade,
  sort_order integer not null,
  title text not null,
  details text not null,
  step_type text not null,
  map text not null,
  is_required boolean not null default true
);

create table if not exists public.step_progress (
  run_id text not null references public.runs(id) on delete cascade,
  step_id text not null references public.quest_steps(id) on delete cascade,
  status text not null default 'not_started',
  current_note text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (run_id, step_id)
);

create table if not exists public.map_telemetry (
  map text primary key,
  coordinates text not null,
  sector text not null,
  area_label text not null,
  signal_status text not null default 'SIGNAL LATCHED',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.boss_intel (
  map text primary key,
  name text not null,
  secondary text not null,
  threat text not null,
  spawn text not null,
  activity text not null,
  priority text not null default 'HIGH',
  updated_at timestamptz not null default timezone('utc', now())
);

${storyQuestSeedSql}

${questStepSeedSql}

${mapTelemetrySeedSql}

${bossIntelSeedSql}

alter publication supabase_realtime add table public.step_progress;
alter publication supabase_realtime add table public.map_telemetry;
alter publication supabase_realtime add table public.boss_intel;
`;
