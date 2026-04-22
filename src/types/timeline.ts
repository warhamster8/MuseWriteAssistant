export interface GlobalTimelineEvent {
  id: string;
  title: string;
  summary: string;
  timeLabel: string;
  estimatedStart: number; 
  estimatedEnd: number;
  importance: 'low' | 'medium' | 'high';
  location?: string;
  characters?: string[];
  isFlashback?: boolean;
  isConflict?: boolean;
  conflictingWith?: string[]; 
}

export interface SceneTimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string; // e.g. "08:30" or "Day 1, Morning"
  duration: number; // in minutes or arbitrary units
  importance: 'low' | 'medium' | 'high';
}
