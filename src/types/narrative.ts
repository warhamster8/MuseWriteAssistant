
import type { SceneTimelineEvent } from './timeline';


export type SceneStatus = 'draft' | 'revised' | 'complete';

export type Scene = {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  order_index: number;
  status?: SceneStatus;
  tags?: string[];
  timeline_events?: SceneTimelineEvent[];
  last_analyzed_content?: string;
  exclude_from_timeline?: boolean;
};




export type Chapter = {
  id: string;
  project_id: string;
  title: string;
  order_index: number;
  scenes?: Scene[];
};
