export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';

export interface TaskDefinition {
  id: string;
  title: string;
  storyline: string;
  sort_order: number;
  map: string;
  description: string;
  requirements: string[];
  dependencies_json: string[];
  major_evidence: string;
}

export interface RunRecord {
  id: string;
  name: string;
  created_at: string;
}

export interface TaskProgressRecord {
  run_id: string;
  task_id: string;
  status: TaskStatus;
  percent_complete: number;
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

export interface SharedTaskView extends TaskDefinition {
  progress: TaskProgressRecord;
}
