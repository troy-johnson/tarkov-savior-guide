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

## What is only derived UI right now
These sections are currently presentation-layer only and are **not** backed by dedicated database tables or live game feeds:

- Top nav tabs (`PRIORITY_DEPLOYMENT`, `STORYLINE_PROGRESS`, `QUEST_INFORMATION`) are local UI state only.
- Map telemetry cards are generated from a hardcoded `mapTelemetry` object in `src/App.tsx`.
- Boss intel is generated from a hardcoded `bossIntelByMap` object in `src/App.tsx`.
- Gear recommendations are derived from task requirements via `toGearList()` in `src/App.tsx`.
- System log lines are derived strings built from the current active task, sync mode, and completion percentage.
- Footer telemetry (latency/version/time text) is display-only.
- The map panel itself is a CSS-rendered placeholder shape, not a real map asset or GIS view.
- The “EXPAND MAP” and “ACCESS INTEL FEED” buttons do not open dedicated views yet.

## What is not wired up / still missing

### STORYLINE_PROGRESS page
Still needs to be created as a real page/view.

Suggested scope:
- Storyline-level grouping and progression overview.
- Breakdown by map / storyline stage.
- Aggregate progress visuals.
- Task dependency visualization.
- Possibly a read-only summary mode for squad planning.

### QUEST_INFORMATION page
Still needs to be created as a real page/view.

Suggested scope:
- Deeper per-task detail.
- Evidence, blockers, dependency chains, and notes history.
- Better task metadata presentation.
- Potential future attachments / screenshots / route notes.

### Routing / navigation
- The app does **not** currently use route-based navigation.
- Switching tabs only changes `activeTab` local state and the section heading.
- There are not yet separate pages/components for the three nav items.

## Backend status

### Current tables in use
- `runs`
- `tasks`
- `task_progress`

### Current realtime usage
- Realtime only listens to `task_progress` changes.
- There is no realtime feed for `tasks`, boss intel, map telemetry, or storyline summaries.

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

### Not actually live today
- Real tab/page navigation
- Real boss intel feed
- Real map data
- Real logistics feed
- Real system log feed
- Dedicated `STORYLINE_PROGRESS` page
- Dedicated `QUEST_INFORMATION` page
