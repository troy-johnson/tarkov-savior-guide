# Tarkov Savior Guide

A lightweight shared-run dashboard that syncs Tarkov Savior quest progress across a squad with optional Supabase persistence.

## What the app does

- Loads seeded task definitions immediately so the UI works during local setup.
- Connects to Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.
- Stores per-run progress in `runs` and `task_progress` tables.
- Subscribes to Supabase Realtime updates for shared progress changes.

## Setup

1. Install dependencies with `npm install`.
2. Create a `.env` file with:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

## Suggested Supabase schema

The app also renders this schema in the UI for quick copy/paste:

- `runs`
- `tasks`
- `task_progress`

These tables should match the types defined in `src/types.ts` and the SQL in `src/lib/supabase.ts`.
