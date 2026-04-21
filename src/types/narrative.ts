export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string; // e.g. "08:30" or "Day 1, Morning"
  duration: number; // in minutes or arbitrary units
  importance: 'low' | 'medium' | 'high';
}

export type Scene = {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  order_index: number;
  timeline_events?: TimelineEvent[];
};

export type Chapter = {
  id: string;
  project_id: string;
  title: string;
  order_index: number;
  scenes?: Scene[];
};
