# Tarkov Savior Guide

A lightweight shared-run dashboard that syncs Tarkov Savior quest progress across a squad with optional Supabase persistence.

## What the app does

- Loads seeded task definitions immediately so the UI works during local setup.
- Connects to Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.
- Stores run identity/metadata in the `runs` table.
- Stores canonical checked-off step state in `step_progress` with one row per `(run_id, step_id)` containing `status`, `current_note`, and `updated_at`.
- Reads optional quest-step logistics metadata from `quest_steps.time_gate`, `quest_steps.required_items`, `quest_steps.items_to_obtain`, and `quest_steps.notes`.
- Uses localStorage only as a client-side fallback/cache when Supabase is unavailable or a write fails.
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

- `runs` (run identity/metadata only)
- `story_quests`
- `quest_steps`
- `quest_steps` should also include optional logistics columns for `time_gate`, `required_items`, `items_to_obtain`, and `notes`
- `step_progress` (canonical checklist state)
- `map_telemetry`
- `boss_intel`

These tables should match the types defined in `src/types.ts` and the SQL in `src/lib/supabase.ts`.
