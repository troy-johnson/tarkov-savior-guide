export type StepStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';
export type StepType = 'raid' | 'trader' | 'hideout' | 'handover' | 'wait' | 'intel';

export interface StoryQuestDefinition {
  id: string;
  title: string;
  storyline: string;
  sort_order: number;
  summary: string;
  source_urls: string[];
}

export interface QuestStepDefinition {
  id: string;
  quest_id: string;
  sort_order: number;
  title: string;
  details: string;
  step_type: StepType;
  map: string;
  is_required: boolean;
}

export interface RunRecord {
  id: string;
  name: string;
  created_at: string;
}

export interface StepProgressRecord {
  run_id: string;
  step_id: string;
  status: StepStatus;
  current_note: string;
  updated_at: string;
}

export interface MapTelemetryRecord {
  map: string;
  coordinates: string;
  sector: string;
  area_label: string;
  signal_status: string;
  updated_at: string;
}

export interface BossIntelRecord {
  map: string;
  name: string;
  secondary: string;
  threat: string;
  spawn: string;
  activity: string;
  priority: string;
  updated_at: string;
}

export interface StoryQuestView extends StoryQuestDefinition {
  steps: StepView[];
  activeSteps: StepView[];
  completedSteps: number;
  requiredSteps: number;
  isComplete: boolean;
}

export interface StepView extends QuestStepDefinition {
  quest: StoryQuestDefinition;
  progress: StepProgressRecord;
  isActive: boolean;
  isComplete: boolean;
}
