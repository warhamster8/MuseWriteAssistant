import React from 'react';
import { useStore } from '../../store/useStore';
import { useTimeline } from '../../hooks/useTimeline';
import { GanttSceneRow } from '../../components/analysis/GanttSceneRow';
import { Calendar, RefreshCw, Zap } from 'lucide-react';
import type { SceneTimelineEvent } from '../../types/timeline';



export const ChronologyView: React.FC = () => {
  const { chapters } = useStore();
  const { generateTimeline, isGenerating } = useTimeline();
  const [selectedEvent, setSelectedEvent] = React.useState<SceneTimelineEvent | null>(null);


  const allScenes = React.useMemo(() => 
    chapters.flatMap(c => c.scenes || [])
  , [chapters]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      <div className="flex items-center justify-between">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-[#5be9b1]" />
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Cronologia Narrativa</h2>
           </div>
           <p className="text-xs text-slate-500 font-medium tracking-wide uppercase font-bold opacity-60">
             Visualizzazione Gantt degli eventi per scena
           </p>
        </div>
        
        <div className="flex items-center gap-4">
           {isGenerating && (
             <div className="flex items-center gap-2 px-4 py-2 bg-[#5be9b1]/10 rounded-xl border border-[#5be9b1]/20 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5be9b1]" />
                <span className="text-[10px] font-black text-[#5be9b1] uppercase tracking-[0.2em]">Sincronizzazione...</span>
             </div>
           )}
        </div>
      </div>

      {allScenes.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white/[0.01] rounded-[40px] border border-dashed border-white/5">
          <Calendar className="w-12 h-12 text-slate-800 mb-6" />
          <p className="text-sm text-slate-600 font-black uppercase tracking-widest">Nessuna scena trovata</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map(chapter => (
            <div key={chapter.id} className="space-y-6">
              <div className="px-6 py-2 bg-white/[0.02] border-l-4 border-[#5be9b1] rounded-r-2xl">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{chapter.title}</span>
              </div>
              
              <div className="pl-6 space-y-2">
                {chapter.scenes?.map(scene => {
                  const hasTimeline = scene.timeline_events && scene.timeline_events.length > 0;
                  
                  return (
                    <div key={scene.id} className="relative">
                      {hasTimeline ? (
                        <GanttSceneRow 
                          sceneTitle={scene.title}
                          events={scene.timeline_events!}
                          onEventClick={setSelectedEvent}
                        />
                      ) : (
                        <div className="group flex items-center justify-between p-6 bg-white/[0.01] hover:bg-white/[0.03] rounded-[32px] border border-white/5 transition-all mb-4 last:mb-0">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Scena: {scene.title}</span>
                             <span className="text-[11px] text-slate-500 italic">Timeline non ancora generata</span>
                           </div>
                           <button 
                             onClick={() => generateTimeline(scene.id, scene.content)}
                             disabled={isGenerating || !scene.content}
                             className="px-6 py-2.5 bg-[#5be9b1]/10 hover:bg-[#5be9b1] text-[#5be9b1] hover:text-[#0b0e11] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-[#5be9b1]/20 hover:border-transparent active:scale-95 disabled:opacity-30"
                           >
                             <Zap className="w-3.5 h-3.5" />
                             Genera Beats
                           </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Detail Modal (Simplistic Overlay) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-[#171b1f] w-full max-w-xl rounded-[40px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div>
                  <span className="px-3 py-1 bg-[#5be9b1]/10 text-[#5be9b1] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#5be9b1]/20">
                    Beato Narrativo
                  </span>
                  <h3 className="text-3xl font-black text-white tracking-tighter mt-4 leading-none uppercase">{selectedEvent.title}</h3>
                </div>
                <div className="flex flex-col items-end">
                   <div className="text-[10px] font-black text-[#5be9b1] uppercase tracking-[0.2em]">{selectedEvent.timestamp}</div>
                   <div className="text-[9px] font-bold text-slate-600 mt-1 uppercase">{selectedEvent.duration} min</div>
                </div>
              </div>
              <div className="p-10 space-y-6">
                 <div>
                   <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4">Cronaca</h4>
                   <p className="text-slate-300 leading-relaxed font-light">{selectedEvent.description}</p>
                 </div>
                 <div className="flex items-center gap-4 pt-6">
                    <button 
                      onClick={() => setSelectedEvent(null)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                    >
                      Chiudi
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
