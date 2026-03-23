import type { BossIntelRecord, MapTelemetryRecord, StepStatus, StepType, StepView, StoryQuestView } from '../../types';

export const tabs = ['PRIORITY_DEPLOYMENT', 'STORYLINE_PROGRESS', 'QUEST_INFORMATION'] as const;
export type TabKey = (typeof tabs)[number];

export const tabMeta: Record<TabKey, { hash: string; label: string; description: string }> = {
  PRIORITY_DEPLOYMENT: {
    hash: '#/priority-deployment',
    label: 'PRIORITY DEPLOYMENT',
    description: 'Live deployment board for the map with the highest active storyline step count.',
  },
  STORYLINE_PROGRESS: {
    hash: '#/storyline-progress',
    label: 'STORYLINE PROGRESS',
    description: 'Questline rollup based on ordered storyline step completion.',
  },
  QUEST_INFORMATION: {
    hash: '#/quest-information',
    label: 'QUEST INFORMATION',
    description: 'Step-by-step quest intelligence with map, trader, and hideout directives.',
  },
};

export function getTabFromHash(hash: string): TabKey {
  const matchedTab = tabs.find((tab) => tabMeta[tab].hash === hash);
  return matchedTab ?? 'PRIORITY_DEPLOYMENT';
}

export const statusLabel: Record<StepStatus, string> = {
  not_started: 'Pending',
  in_progress: 'Tracking',
  blocked: 'Blocked',
  done: 'Complete',
};

export const stepTypeLabel: Record<StepType, string> = {
  raid: 'Raid',
  trader: 'Trader',
  hideout: 'Hideout',
  handover: 'Handover',
  wait: 'Time Gate',
  intel: 'Intel',
};

export const realRaidMaps = new Set([
  'Ground Zero',
  'Customs',
  'Factory',
  'Interchange',
  'Labs',
  'Lighthouse',
  'Reserve',
  'Shoreline',
  'Streets of Tarkov',
  'Terminal',
  'The Labyrinth',
  'Woods',
]);

const defaultTime = '2026-01-01T00:00:00.000Z';

export const seedMapTelemetry: Record<string, MapTelemetryRecord> = {
  'Ground Zero': { map: 'Ground Zero', coordinates: '59.9320° N, 30.3609° E', sector: 'EMERGENCY_CORDON // GZ-01', area_label: 'AREA_IDENTIFIED: GROUND_ZERO', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Customs: { map: 'Customs', coordinates: '59.8794° N, 30.2798° E', sector: 'DORMS_APPROACH // CU-02', area_label: 'AREA_IDENTIFIED: CUSTOMS', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Interchange: { map: 'Interchange', coordinates: '59.8915° N, 30.3154° E', sector: 'ULTRA_FORECOURT // IC-03', area_label: 'AREA_IDENTIFIED: INTERCHANGE', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Labs: { map: 'Labs', coordinates: '52.4839° N, 13.3364° E', sector: 'TERRAGROUP_SUB_04 // ALPHA_LEVEL_3', area_label: 'AREA_IDENTIFIED: THE_LABS', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Lighthouse: { map: 'Lighthouse', coordinates: '43.0952° N, 131.8735° E', sector: 'KEEPER_APPROACH // LH-04', area_label: 'AREA_IDENTIFIED: LIGHTHOUSE', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Reserve: { map: 'Reserve', coordinates: '59.9534° N, 30.3058° E', sector: 'BUNKER_GRID // RV-05', area_label: 'AREA_IDENTIFIED: RESERVE', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Shoreline: { map: 'Shoreline', coordinates: '59.8468° N, 30.1911° E', sector: 'RESORT_PERIMETER // SL-06', area_label: 'AREA_IDENTIFIED: SHORELINE', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  'Streets of Tarkov': { map: 'Streets of Tarkov', coordinates: '59.9343° N, 30.3351° E', sector: 'URBAN_CONTACT_GRID // ST-07', area_label: 'AREA_IDENTIFIED: STREETS', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Terminal: { map: 'Terminal', coordinates: '59.9181° N, 30.2465° E', sector: 'PORT_ENTRY_VECTOR // TM-08', area_label: 'AREA_IDENTIFIED: TERMINAL', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  'The Labyrinth': { map: 'The Labyrinth', coordinates: '59.8472° N, 30.1903° E', sector: 'SUBTERRANEAN_NODE // LB-09', area_label: 'AREA_IDENTIFIED: THE_LABYRINTH', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
  Woods: { map: 'Woods', coordinates: '60.0137° N, 30.2532° E', sector: 'RITUAL_CLEARING // WD-10', area_label: 'AREA_IDENTIFIED: WOODS', signal_status: 'SIGNAL LATCHED', updated_at: defaultTime },
};

export const seedBossIntelByMap: Record<string, BossIntelRecord> = {
  'Ground Zero': { map: 'Ground Zero', name: 'SCAV PATROL', secondary: 'Convoy crash zone disturbed', threat: 'MODERATE', spawn: '76% sweep', activity: 'Checkpoint movement confirmed', priority: 'HIGH', updated_at: defaultTime },
  Customs: { map: 'Customs', name: 'RESHALA', secondary: 'Dorms sector unstable', threat: 'SEVERE', spawn: 'Variable', activity: 'Stash route under watch', priority: 'HIGH', updated_at: defaultTime },
  Interchange: { map: 'Interchange', name: 'KILLA', secondary: 'ULTRA forecourt active', threat: 'EXTREME', spawn: 'Variable', activity: 'Interior sweep likely', priority: 'HIGH', updated_at: defaultTime },
  Labs: { map: 'Labs', name: 'RAIDERS', secondary: 'Relay and access nodes online', threat: 'EXTREME', spawn: 'Persistent', activity: 'High-value intelligence pressure', priority: 'HIGH', updated_at: defaultTime },
  Lighthouse: { map: 'Lighthouse', name: 'ROGUE OUTPOST', secondary: 'Keeper route contested', threat: 'HIGH', spawn: '81% sweep', activity: 'Watchtower coverage active', priority: 'HIGH', updated_at: defaultTime },
  Reserve: { map: 'Reserve', name: 'GLUKHAR', secondary: 'Bunker approaches compromised', threat: 'HIGH', spawn: 'Variable', activity: 'Underground movement detected', priority: 'HIGH', updated_at: defaultTime },
  Shoreline: { map: 'Shoreline', name: 'SANITAR', secondary: 'Resort under observation', threat: 'SEVERE', spawn: 'Variable', activity: 'West wing pressure rising', priority: 'HIGH', updated_at: defaultTime },
  'Streets of Tarkov': { map: 'Streets of Tarkov', name: 'KABAN', secondary: 'Apartment and convoy routes active', threat: 'SEVERE', spawn: '62% sweep', activity: 'Urban patrol net tightening', priority: 'HIGH', updated_at: defaultTime },
  Terminal: { map: 'Terminal', name: 'UNKNOWN CELL', secondary: 'Port approach not verified', threat: 'HIGH', spawn: 'Unknown', activity: 'Final route still dark', priority: 'HIGH', updated_at: defaultTime },
  'The Labyrinth': { map: 'The Labyrinth', name: 'LAB SECURITY', secondary: 'Sublevel contact residual', threat: 'EXTREME', spawn: 'Persistent', activity: 'Underground patrols in motion', priority: 'HIGH', updated_at: defaultTime },
  Woods: { map: 'Woods', name: 'CULTIST SIGNS', secondary: 'Ritual route confirmed', threat: 'HIGH', spawn: 'Night weighted', activity: 'Silent movement around clearings', priority: 'HIGH', updated_at: defaultTime },
};

export function toDirectiveSubtitle(step: StepView) {
  return `${step.quest.title.toUpperCase()} // ${stepTypeLabel[step.step_type].toUpperCase()}`;
}

export function toGearList(step: StepView) {
  const lower = `${step.title} ${step.details}`.toLowerCase();
  const gear = [] as Array<{ label: string; quantity: string; accent: 'amber' | 'sage' }>;

  if (lower.includes('keycard') || lower.includes('pass')) {
    gear.push({ label: 'Access keycard', quantity: 'REQ.', accent: 'sage' });
  }
  if (lower.includes('signal jammer')) {
    gear.push({ label: 'Signal jammer', quantity: 'x1', accent: 'amber' });
  }
  if (lower.includes('flare')) {
    gear.push({ label: 'Yellow flare', quantity: 'x1', accent: 'amber' });
  }
  if (lower.includes('mark') || lower.includes('plant')) {
    gear.push({ label: 'MS2000 marker', quantity: 'x1', accent: 'amber' });
  }
  if (lower.includes('read') || lower.includes('inspect')) {
    gear.push({ label: 'Intel space', quantity: 'REQ.', accent: 'sage' });
  }
  if (step.step_type === 'raid' && gear.length === 0) {
    gear.push({ label: 'Raid kit', quantity: 'REQ.', accent: 'sage' });
  }
  if (step.map === 'The Labyrinth') {
    gear.unshift({ label: 'Labrys keycard', quantity: 'REQ.', accent: 'sage' });
  }

  return gear.slice(0, 3);
}

export function toRequiredGearList(steps: StepView[]) {
  const normalized = new Map<string, { label: string; quantity: string; accent: 'amber' | 'sage' }>();

  for (const step of steps) {
    for (const item of step.required_items) {
      const label = item.trim();
      if (!label) {
        continue;
      }

      const key = label.toLowerCase();
      if (!normalized.has(key)) {
        normalized.set(key, { label, quantity: 'REQ.', accent: 'sage' });
      }
    }
  }

  if (normalized.size > 0) {
    return [...normalized.values()].slice(0, 6);
  }

  const fallback = new Map<string, { label: string; quantity: string; accent: 'amber' | 'sage' }>();
  for (const step of steps) {
    for (const item of toGearList(step)) {
      const key = item.label.toLowerCase();
      if (!fallback.has(key)) {
        fallback.set(key, item);
      }
    }
  }

  return [...fallback.values()].slice(0, 6);
}

export function toQuestCompletion(quest: StoryQuestView) {
  return quest.requiredSteps === 0 ? 0 : Math.round((quest.completedSteps / quest.requiredSteps) * 100);
}
