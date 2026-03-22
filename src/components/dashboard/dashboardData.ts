import type { SharedTaskView, TaskStatus } from '../../types';

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

export const mapTelemetry: Record<string, { coordinates: string; sector: string; areaLabel: string }> = {
  'Ground Zero': {
    coordinates: '40.7128° N, 74.0060° W',
    sector: 'CIVIC_MEDICAL_NODE // GZ-01',
    areaLabel: 'AREA_IDENTIFIED: GROUND_ZERO',
  },
  'Streets of Tarkov': {
    coordinates: '59.9343° N, 30.3351° E',
    sector: 'CONVOY_GRID // ST-02',
    areaLabel: 'AREA_IDENTIFIED: STREETS',
  },
  Lighthouse: {
    coordinates: '43.0952° N, 131.8735° E',
    sector: 'EVAC_ROUTE // LH-03',
    areaLabel: 'AREA_IDENTIFIED: LIGHTHOUSE',
  },
  Labs: {
    coordinates: '52.4839° N, 13.3364° E',
    sector: 'TERRAGROUP_SUB_04 // ALPHA_LEVEL_3',
    areaLabel: 'AREA_IDENTIFIED: THE_LABS',
  },
};

export const bossIntelByMap: Record<string, { name: string; secondary: string; threat: string; spawn: string; activity: string }> = {
  'Ground Zero': {
    name: 'SCAV PATROL',
    secondary: 'Civilian perimeter disturbed',
    threat: 'MODERATE',
    spawn: '76% sweep',
    activity: 'Checkpoint pressure rising',
  },
  'Streets of Tarkov': {
    name: 'KABAN',
    secondary: 'Convoy interception route active',
    threat: 'SEVERE',
    spawn: '62% sweep',
    activity: 'Guards circling dealership block',
  },
  Lighthouse: {
    name: 'ROGUE OUTPOST',
    secondary: 'Shoreline lane still contested',
    threat: 'HIGH',
    spawn: '81% sweep',
    activity: 'Watchtower eyes on southern crossing',
  },
  Labs: {
    name: 'KILLA',
    secondary: 'Reports: recent',
    threat: 'EXTREME',
    spawn: '100% spawn',
    activity: '02 sector // mid',
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
