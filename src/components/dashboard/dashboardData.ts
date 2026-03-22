import type { BossIntelRecord, MapTelemetryRecord, SharedTaskView, TaskStatus } from '../../types';

export const tabs = ['PRIORITY_DEPLOYMENT', 'STORYLINE_PROGRESS', 'QUEST_INFORMATION'] as const;
export type TabKey = (typeof tabs)[number];

export const tabMeta: Record<TabKey, { hash: string; label: string; description: string }> = {
  PRIORITY_DEPLOYMENT: {
    hash: '#/priority-deployment',
    label: 'PRIORITY DEPLOYMENT',
    description: 'Live deployment board for the active squad objective.',
  },
  STORYLINE_PROGRESS: {
    hash: '#/storyline-progress',
    label: 'STORYLINE PROGRESS',
    description: 'Progress rollup across questlines, maps, and blockers.',
  },
  QUEST_INFORMATION: {
    hash: '#/quest-information',
    label: 'QUEST INFORMATION',
    description: 'Detailed quest intelligence, requirements, and evidence.',
  },
};

export function getTabFromHash(hash: string): TabKey {
  const matchedTab = tabs.find((tab) => tabMeta[tab].hash === hash);
  return matchedTab ?? 'PRIORITY_DEPLOYMENT';
}

export const statusLabel: Record<TaskStatus, string> = {
  not_started: 'Pending',
  in_progress: 'Tracking',
  blocked: 'Blocked',
  done: 'Complete',
};

export const seedMapTelemetry: Record<string, MapTelemetryRecord> = {
  'Ground Zero': {
    map: 'Ground Zero',
    coordinates: '40.7128° N, 74.0060° W',
    sector: 'CIVIC_MEDICAL_NODE // GZ-01',
    area_label: 'AREA_IDENTIFIED: GROUND_ZERO',
    signal_status: 'SIGNAL LATCHED',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  'Streets of Tarkov': {
    map: 'Streets of Tarkov',
    coordinates: '59.9343° N, 30.3351° E',
    sector: 'CONVOY_GRID // ST-02',
    area_label: 'AREA_IDENTIFIED: STREETS',
    signal_status: 'SIGNAL LATCHED',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  Lighthouse: {
    map: 'Lighthouse',
    coordinates: '43.0952° N, 131.8735° E',
    sector: 'EVAC_ROUTE // LH-03',
    area_label: 'AREA_IDENTIFIED: LIGHTHOUSE',
    signal_status: 'SIGNAL LATCHED',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  Labs: {
    map: 'Labs',
    coordinates: '52.4839° N, 13.3364° E',
    sector: 'TERRAGROUP_SUB_04 // ALPHA_LEVEL_3',
    area_label: 'AREA_IDENTIFIED: THE_LABS',
    signal_status: 'SIGNAL LATCHED',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
};

export const seedBossIntelByMap: Record<string, BossIntelRecord> = {
  'Ground Zero': {
    map: 'Ground Zero',
    name: 'SCAV PATROL',
    secondary: 'Civilian perimeter disturbed',
    threat: 'MODERATE',
    spawn: '76% sweep',
    activity: 'Checkpoint pressure rising',
    priority: 'HIGH',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  'Streets of Tarkov': {
    map: 'Streets of Tarkov',
    name: 'KABAN',
    secondary: 'Convoy interception route active',
    threat: 'SEVERE',
    spawn: '62% sweep',
    activity: 'Guards circling dealership block',
    priority: 'HIGH',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  Lighthouse: {
    map: 'Lighthouse',
    name: 'ROGUE OUTPOST',
    secondary: 'Shoreline lane still contested',
    threat: 'HIGH',
    spawn: '81% sweep',
    activity: 'Watchtower eyes on southern crossing',
    priority: 'HIGH',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  Labs: {
    map: 'Labs',
    name: 'KILLA',
    secondary: 'Reports: recent',
    threat: 'EXTREME',
    spawn: '100% spawn',
    activity: '02 sector // mid',
    priority: 'HIGH',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
};

export function toDirectiveSubtitle(task: SharedTaskView) {
  return task.storyline === 'Savior' ? 'THE SAVIOR PROTOCOL' : task.storyline.toUpperCase();
}

export function toGearList(task: SharedTaskView) {
  const gear = task.requirements.map((item) => {
    const lowered = item.toLowerCase();
    if (lowered.includes('camera')) {
      return { label: 'WiFi camera', quantity: 'x2', accent: 'amber' as const };
    }
    if (lowered.includes('med')) {
      return { label: 'Compact medkit', quantity: 'x1', accent: 'amber' as const };
    }
    if (lowered.includes('signal')) {
      return { label: 'Signal jammer', quantity: 'x1', accent: 'amber' as const };
    }
    if (lowered.includes('lighthouse keeper')) {
      return { label: 'Blue keycard', quantity: 'REQ.', accent: 'sage' as const };
    }
    return { label: item, quantity: 'REQ.', accent: 'sage' as const };
  });

  if (!gear.some((entry) => entry.label.toLowerCase().includes('marker'))) {
    gear.unshift({ label: 'MS2000 marker', quantity: 'x3', accent: 'amber' as const });
  }

  return gear.slice(0, 3);
}
