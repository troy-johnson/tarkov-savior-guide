import './styles.css';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const app = document.querySelector('#app');

if (!app) {
  throw new Error('App root not found.');
}

const supabaseUrl = readConfig('VITE_SUPABASE_URL');
const supabaseAnonKey = readConfig('VITE_SUPABASE_ANON_KEY');
const resolvedId = resolveSharedIdentifier();

app.innerHTML = renderShell(resolvedId);

if (!supabaseUrl || !supabaseAnonKey) {
  renderError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
} else if (!resolvedId) {
  renderError('Add ?share=<share-id> or ?run=<run-id> to load a shared run.');
} else {
  void loadSharedRun(resolvedId, createClient(supabaseUrl, supabaseAnonKey));
}

function readConfig(key) {
  const meta = document.querySelector(`meta[name="${key}"]`);
  return meta?.content?.trim() || window[key] || '';
}

function resolveSharedIdentifier() {
  const params = new URLSearchParams(window.location.search);
  const candidates = ['share', 'shareId', 'run', 'runId', 'id'];

  for (const key of candidates) {
    const value = params.get(key)?.trim();
    if (value) {
      return value;
    }
  }

  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  return pathSegments.at(-1) ?? null;
}

function renderShell(identifier) {
  const shareLabel = identifier ? escapeHtml(identifier) : 'No share ID';

  return `
    <main class="page-shell">
      <section class="hero-card">
        <p class="eyebrow">Shared run dashboard</p>
        <h1>Tarkov Savior Guide</h1>
        <p class="subtle-copy">No-login access powered by a Supabase share/run ID.</p>
        <div class="share-chip">${shareLabel}</div>
      </section>

      <section id="status" class="status-card">Loading shared run data…</section>

      <section id="dashboard" class="dashboard-grid hidden" aria-live="polite">
        <article class="dashboard-card">
          <p class="card-label">Current deployment priority</p>
          <h2 id="deployment-priority">—</h2>
        </article>

        <article class="dashboard-card">
          <p class="card-label">Objective checklist</p>
          <ul id="objective-checklist" class="checklist"></ul>
        </article>

        <article class="dashboard-card">
          <p class="card-label">Gear / keys / items</p>
          <ul id="gear-items" class="pill-list"></ul>
        </article>

        <article class="dashboard-card">
          <p class="card-label">Shared squad note / progress</p>
          <div class="stacked-copy">
            <p id="squad-note" class="body-copy"></p>
            <p id="squad-progress" class="meta-copy"></p>
          </div>
        </article>

        <article class="dashboard-card">
          <p class="card-label">Last raid-data refresh timestamp</p>
          <p id="raid-refresh" class="body-copy"></p>
        </article>
      </section>
    </main>
  `;
}

async function loadSharedRun(identifier, supabase) {
  const status = getById('status');
  const safeIdentifier = identifier.replaceAll(',', '%2C');
  const { data, error } = await supabase
    .from('shared_runs')
    .select(
      'share_id, run_id, deployment_priority, objective_checklist, gear_keys_items, squad_note, squad_progress, raid_data_refreshed_at',
    )
    .or(`share_id.eq.${safeIdentifier},run_id.eq.${safeIdentifier}`)
    .maybeSingle();

  if (error) {
    renderError(`Unable to load shared run: ${error.message}`);
    return;
  }

  if (!data) {
    renderError(`No shared run found for “${identifier}”.`);
    return;
  }

  status.textContent = `Loaded shared run ${data.share_id || data.run_id}.`;
  status.classList.add('status-success');
  getById('dashboard').classList.remove('hidden');

  getById('deployment-priority').textContent = data.deployment_priority ?? 'Not set';
  renderChecklist(data.objective_checklist ?? []);
  renderGearItems(data.gear_keys_items);
  getById('squad-note').textContent = data.squad_note ?? 'No shared squad note.';
  getById('squad-progress').textContent = data.squad_progress ?? 'No shared progress update.';
  getById('raid-refresh').textContent = formatTimestamp(data.raid_data_refreshed_at);
}

function renderChecklist(items) {
  const checklist = getById('objective-checklist');

  if (!Array.isArray(items) || items.length === 0) {
    checklist.innerHTML = '<li class="empty-state">No objectives shared yet.</li>';
    return;
  }

  checklist.innerHTML = items
    .map((item) => {
      const statusLabel = item.done ? 'Done' : 'Pending';
      const notes = item.notes ? `<span class="checklist-note">${escapeHtml(item.notes)}</span>` : '';

      return `
        <li class="checklist-item ${item.done ? 'is-done' : ''}">
          <span>
            <strong>${escapeHtml(item.label || 'Untitled objective')}</strong>
            ${notes}
          </span>
          <span class="checklist-state">${statusLabel}</span>
        </li>
      `;
    })
    .join('');
}

function renderGearItems(value) {
  const gearItems = getById('gear-items');
  const parsedItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  if (parsedItems.length === 0) {
    gearItems.innerHTML = '<li class="empty-state">No gear, keys, or items shared.</li>';
    return;
  }

  gearItems.innerHTML = parsedItems
    .map((item) => `<li class="pill">${escapeHtml(item)}</li>`)
    .join('');
}

function formatTimestamp(value) {
  if (!value) {
    return 'Not refreshed yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function renderError(message) {
  const status = getById('status');
  status.textContent = message;
  status.classList.add('status-error');
}

function getById(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element #${id}`);
  }

  return element;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
