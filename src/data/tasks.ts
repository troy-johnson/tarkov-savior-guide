import type { TaskDefinition } from '../types';

export const seedTasks: TaskDefinition[] = [
  {
    id: 'saving-the-mole',
    title: 'Saving the Mole',
    storyline: 'Savior',
    sort_order: 1,
    map: 'Ground Zero',
    description: 'Secure the clinic and identify the first signs of the missing rescue team.',
    requirements: ['Unlock Ground Zero access', 'Bring a compact medkit'],
    dependencies_json: [],
    major_evidence: 'Clinic ledger and paramedic armband',
  },
  {
    id: 'humanitarian-hush',
    title: 'Humanitarian Hush',
    storyline: 'Savior',
    sort_order: 2,
    map: 'Streets of Tarkov',
    description: 'Locate the convoy cache and verify whether the civilians made it out.',
    requirements: ['Complete Saving the Mole', 'Bring signal jammer'],
    dependencies_json: ['saving-the-mole'],
    major_evidence: 'Burned route manifest',
  },
  {
    id: 'last-evac-window',
    title: 'Last Evac Window',
    storyline: 'Savior',
    sort_order: 3,
    map: 'Lighthouse',
    description: 'Re-open the shoreline evacuation lane and report the final survivor count.',
    requirements: ['Complete Humanitarian Hush', 'Access to Lighthouse keeper zone'],
    dependencies_json: ['humanitarian-hush'],
    major_evidence: 'Portable radio log and evac flare records',
  },
];
