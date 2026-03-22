# Tarkov Savior Guide

A lightweight shared-run dashboard that loads data from Supabase without requiring sign-in.

## Shared-link / no-login model

The app reads a shared run identifier directly from the URL and fetches the corresponding record from the `shared_runs` table using the Supabase anon key.

Supported URL formats:

- `/?share=<share-id>`
- `/?run=<run-id>`
- `/<share-id>`

## Dashboard fields

The dashboard renders these shared-run fields:

- current deployment priority
- objective checklist
- gear / keys / items
- shared squad note / progress
- last raid-data refresh timestamp

## Local development

1. Add your Supabase values either as meta tags in `index.html` or global values before `src/main.js` runs:
   ```html
   <meta name="VITE_SUPABASE_URL" content="https://your-project.supabase.co" />
   <meta name="VITE_SUPABASE_ANON_KEY" content="your-anon-key" />
   ```
2. Serve the repository with any static file server, for example:
   ```bash
   python3 -m http.server 4173
   ```
3. Open a shared link such as `http://localhost:4173/?share=alpha-run`.

## Expected Supabase schema

The client expects a `shared_runs` table or view with these columns:

- `share_id` text
- `run_id` text
- `deployment_priority` text
- `objective_checklist` json/jsonb array
- `gear_keys_items` text or text[]
- `squad_note` text
- `squad_progress` text
- `raid_data_refreshed_at` timestamptz
