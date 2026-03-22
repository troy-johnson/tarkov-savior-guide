import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RunRecord, TaskDefinition, TaskProgressRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type AppDatabase = {
  public: {
    Tables: {
      runs: {
        Row: RunRecord;
        Insert: Pick<RunRecord, 'id' | 'name'> & Partial<Pick<RunRecord, 'created_at'>>;
        Update: Partial<RunRecord>;
      };
      tasks: {
        Row: TaskDefinition;
        Insert: TaskDefinition;
        Update: Partial<TaskDefinition>;
      };
      task_progress: {
        Row: TaskProgressRecord;
        Insert: TaskProgressRecord;
        Update: Partial<TaskProgressRecord>;
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

export const schemaSql = `
create table if not exists public.runs (
  id text primary key,
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  storyline text not null,
  sort_order integer not null,
  map text not null,
  description text not null,
  requirements jsonb not null default '[]'::jsonb,
  dependencies_json jsonb not null default '[]'::jsonb,
  major_evidence text not null
);

create table if not exists public.task_progress (
  run_id text not null references public.runs(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  status text not null default 'not_started',
  percent_complete integer not null default 0,
  current_note text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (run_id, task_id)
);

alter publication supabase_realtime add table public.task_progress;
`;
