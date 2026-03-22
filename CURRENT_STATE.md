# Current State

## What is wired up today

### Shared data flow
- The app loads task definitions from Supabase `tasks` when available.
- If the remote `tasks` table is empty or Supabase is unavailable, the UI falls back to local `seedTasks`.
- The current run is loaded from `runs` by `run.id`.
- Task progress is loaded from `task_progress` for the active run.
- Progress updates are written back to `task_progress` with `upsert`.
- Realtime subscription is set up for `task_progress` changes on the current run.
- A manual refresh trigger exists and forces the load effect to run again.

### User interactions that are real
- Joining/changing a run ID updates local storage and reloads that run.
- Marking an objective complete in the directive list updates the underlying task progress.
- Changing status in a task card updates the underlying task progress.
- Moving the completion slider updates the underlying task progress.
- Editing the field note updates the underlying task progress and sets status to `in_progress`.
- Completion percentage in the dashboard is derived from the live task progress values.
- Switching tabs changes the rendered dashboard view for `PRIORITY_DEPLOYMENT`, `STORYLINE_PROGRESS`, and `QUEST_INFORMATION`.

### Dashboard views that now exist
- `PRIORITY_DEPLOYMENT` is a dedicated dashboard view with the directive list, map panel, boss intel panel, logistics panel, and editable task cards.
- `STORYLINE_PROGRESS` is a dedicated dashboard view that summarizes progress by storyline, includes map-level completion, and surfaces dependency chains.
- `QUEST_INFORMATION` is a dedicated dashboard view that shows per-task detail cards with evidence, requirements, dependencies, notes, and timestamps.

## What is only derived UI right now
These sections are currently presentation-layer only and are **not** backed by dedicated database tables or live game feeds:

- Top nav tabs are real conditional views, but they are still local UI state rather than route-based navigation.
- Map telemetry cards are generated from a hardcoded `mapTelemetry` object in `src/components/dashboard/dashboardData.ts`.
- Boss intel is generated from a hardcoded `bossIntelByMap` object in `src/components/dashboard/dashboardData.ts`.
- Gear recommendations are derived from task requirements via `toGearList()` in `src/components/dashboard/dashboardData.ts`.
- `STORYLINE_PROGRESS` summaries are derived from the current loaded task/task-progress dataset in the client.
- `QUEST_INFORMATION` detail cards are derived from the current loaded task/task-progress dataset in the client.
- System log lines are derived strings built from the current active task, sync mode, and completion percentage.
- Footer telemetry (latency/version/time text) is display-only.
- The map panel itself is a CSS-rendered placeholder shape, not a real map asset or GIS view.
- The “EXPAND MAP” and “ACCESS INTEL FEED” buttons do not open dedicated views yet.

## What is not wired up / still missing

### Routing / navigation
- The app does **not** currently use route-based navigation.
- Switching tabs changes local `activeTab` UI state rather than the URL.
- There are still not separate route entries or deep links for the three dashboard views.

### STORYLINE_PROGRESS follow-up work
The view now exists, but still has room to become more real.

Potential next steps:
- Storyline stage metadata instead of only grouping by `storyline` text.
- Richer aggregate visuals or charting.
- Better dependency visualization than a simple derived list.
- A read-only squad planning or export mode.

### QUEST_INFORMATION follow-up work
The view now exists, but still needs richer long-term detail capabilities.

Potential next steps:
- Notes history instead of only the latest note.
- Blocker tracking and structured evidence fields.
- Attachments / screenshots / route notes.
- Direct dependency expansion and backlink navigation.

## Backend status

### Current tables in use
- `runs`
- `tasks`
- `task_progress`

### Current realtime usage
- Realtime only listens to `task_progress` changes.
- There is no realtime feed for `tasks`, boss intel, map telemetry, storyline summaries, or quest detail activity history.

### Data model gaps if we want the wireframe to be fully real
If we want the dashboard to become fully data-driven, we likely need additional backend structures for some or all of the following:
- boss intel / threat feed
- map metadata / map assets
- gear recommendations or loot requirements
- storyline summaries
- richer task notes / event log / activity history
- page-specific view models for storyline and quest detail screens

## Practical takeaway

### Actually live today
- Shared run selection
- Shared task progress loading
- Shared task progress editing
- Progress persistence
- Realtime task progress sync
- Manual refresh reload
- Dedicated conditional views for `PRIORITY_DEPLOYMENT`, `STORYLINE_PROGRESS`, and `QUEST_INFORMATION`

### Not actually live today
- Real tab/page routing
- Real boss intel feed
- Real map data
- Real logistics feed
- Real system log feed
- Historical quest notes / activity log
- Dedicated deep links for storyline and quest detail screens
