# Tarkov Savior Guide

A lightweight React + Vite tracker for Escape from Tarkov's Savior questline with optional Supabase-backed shared progress.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in your Supabase project URL + anon key.
3. Run `npm run dev`.

## Supabase schema

Use the SQL shown in the app or `src/lib/supabase.ts` to create:

- `runs(id, name, created_at)`
- `tasks(id, title, storyline, sort_order, map, description, requirements, dependencies_json, major_evidence)`
- `task_progress(run_id, task_id, status, percent_complete, current_note, updated_at)`

Task definitions can live in Supabase or fall back to the local seed in `src/data/tasks.ts`.
