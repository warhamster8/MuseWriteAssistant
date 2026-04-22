
import type { SceneTimelineEvent } from './timeline';


export type Scene = {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  order_index: number;
  timeline_events?: SceneTimelineEvent[];
};


export type Chapter = {
  id: string;
  project_id: string;
  title: string;
  order_index: number;
  scenes?: Scene[];
};
