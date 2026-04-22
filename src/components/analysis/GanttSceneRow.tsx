import type { SceneTimelineEvent } from '../../types/timeline';


import { cn } from '../../lib/utils';
import { Clock } from 'lucide-react';

interface GanttSceneRowProps {
  sceneTitle: string;
  events: SceneTimelineEvent[];
  onEventClick?: (event: SceneTimelineEvent) => void;
}

export const GanttSceneRow: React.FC<GanttSceneRowProps> = ({ sceneTitle, events, onEventClick }) => {
  if (!events || events.length === 0) return null;

  // Calculate some simple proportions for the "Gantt" view
  // Since we don't have absolute pixel widths based on time yet,
  // we'll distribute them based on their relative order and duration.
  const totalDuration = events.reduce((acc, curr) => acc + (curr.duration || 10), 0);

  return (
    <div className="group/row mb-8 last:mb-0">
      <div className="flex items-center gap-3 mb-4">
        <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 group-hover/row:border-[#5be9b1]/30 transition-all">
          <span className="text-[10px] font-black text-slate-400 group-hover/row:text-[#5be9b1] uppercase tracking-widest leading-none">
            {sceneTitle}
          </span>
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      <div className="relative h-24 flex items-center gap-1 overflow-x-auto pb-4 scrollbar-hide">
        {events.map((event, idx) => {
          const widthPercent = Math.max(15, (event.duration / totalDuration) * 100);
          
          return (
            <div 
              key={event.id || idx}
              onClick={() => onEventClick?.(event)}
              style={{ width: `${widthPercent}%`, minWidth: '160px' }}
              className={cn(
                "h-full rounded-2xl p-4 transition-all cursor-pointer relative group flex flex-col justify-between border",
                event.importance === 'high' 
                  ? "bg-[#5be9b1]/20 border-[#5be9b1]/30 hover:bg-[#5be9b1]/30" 
                  : event.importance === 'medium'
                  ? "bg-white/5 border-white/10 hover:border-white/20"
                  : "bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#5be9b1]/70 truncate mr-2">
                  {event.timestamp}
                </span>
                <Clock className="w-2.5 h-2.5 text-slate-700" />
              </div>
              
              <div className="mt-2">
                 <h4 className="text-[11px] font-bold text-white leading-tight truncate">{event.title}</h4>
                 <p className="text-[9px] text-slate-500 line-clamp-2 mt-1 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                    {event.description}
                 </p>
              </div>

              {/* Connecting Line Dots */}
              {idx < events.length - 1 && (
                <div className="absolute top-1/2 -right-1 w-2 h-2 bg-[#5be9b1]/20 rounded-full blur-[2px] z-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
