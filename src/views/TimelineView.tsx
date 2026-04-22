import React, { useState } from 'react';
import { 
  GitCommit, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  Zap,
  Info,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { timelineUtils } from '../lib/timelineUtils';
import type { GlobalTimelineEvent } from '../types/timeline';

import { useToast } from '../components/Toast';
import { cleanHtml } from '../lib/analysisUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';


import { useNarrative } from '../hooks/useNarrative';

export const TimelineView: React.FC = () => {
  const chapters = useStore(s => s.chapters);
  const timelineEvents = useStore(s => s.timelineEvents);
  
  // Rimuoviamo il set diretto poiché ora usiamo l'aggiornamento tramite hook
  // const setTimelineEvents = useStore(s => s.setTimelineEvents);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const aiConfig = useStore(s => s.aiConfig);
  const { addToast } = useToast();


  const { updateProjectTimeline, updateSceneMetadata } = useNarrative();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const allScenes = chapters.flatMap(c => c.scenes || []);
      
      // 1. Filtriamo solo le scene NON escluse (non bozze)
      const activeScenes = allScenes.filter(s => !s.exclude_from_timeline);

      // 2. Transizione e Pulizia: 
      // Se ci sono eventi "legacy" (senza sceneId) o scene escluse che hanno ancora eventi, 
      // dobbiamo procedere con l'analisi.
      const hasLegacyEvents = timelineEvents.some(e => !e.sceneId);
      const activeSceneIds = new Set(activeScenes.map(s => s.id));
      const hasExcludedScenesToRemove = timelineEvents.some(e => e.sceneId && !activeSceneIds.has(e.sceneId));

      // 3. Identifichiamo le scene da analizzare
      const scenesToAnalyze = activeScenes.filter(s => {
        // Se abbiamo eventi vecchi senza ID, forziamo la ri-analisi di tutto per "taggarli" correttamente
        if (hasLegacyEvents) return true; 
        
        const currentText = cleanHtml(s.content || '').trim();
        const hasText = currentText.length > 0;
        
        // Verifichiamo se questa scena (attiva) ha già degli eventi nella timeline
        const hasEventsInTimeline = timelineEvents.some(e => e.sceneId === s.id);

        // Analizziamo se:
        // A. Il testo è cambiato
        // B. La scena è attiva ma non ha eventi (es. appena re-inclusa o nuova)
        return (currentText !== (s.last_analyzed_content || '').trim()) || (!hasEventsInTimeline && hasText);
      });


      if (scenesToAnalyze.length === 0 && !hasExcludedScenesToRemove && !hasLegacyEvents) {
        addToast("Nessuna modifica rilevata nel manoscritto dall'ultima analisi.", "info");
        setIsAnalyzing(false);
        return;
      }

      const statusMsg = hasLegacyEvents 
        ? "Aggiornamento sistema: indicizzazione completa della timeline..." 
        : `Analisi incrementale: ${scenesToAnalyze.length} scene nuove o modificate...`;
        
      addToast(statusMsg, "info");


      // 2. Analizziamo solo le scene modificate
      const newEvents: GlobalTimelineEvent[] = [];
      
      for (const scene of scenesToAnalyze) {
        const text = cleanHtml(scene.content || '');
        if (!text.trim()) continue;
        
        try {
          const events = await timelineUtils.extractEvents(text, aiConfig);
          // Aggiungiamo il sceneId per tracciare la provenienza
          newEvents.push(...events.map(e => ({ ...e, sceneId: scene.id })));
        } catch (e) {
          console.error(`Errore analisi scena ${scene.title}:`, e);
        }
      }

      // 3. Uniamo i risultati: rimuoviamo i vecchi eventi delle scene ricalcolate O rimosse
      const modifiedSceneIds = new Set(scenesToAnalyze.map(s => s.id));
      const preservedEvents = timelineEvents.filter(e => 
        e.sceneId && activeSceneIds.has(e.sceneId) && !modifiedSceneIds.has(e.sceneId)
      );
      
      const combinedEvents = [...preservedEvents, ...newEvents];

      const conflictMap = timelineUtils.detectOverlaps(combinedEvents);
      
      const finalEvents = combinedEvents.map(e => ({
        ...e,
        isConflict: !!conflictMap[e.id],
        conflictingWith: conflictMap[e.id] || []
      })).sort((a, b) => a.estimatedStart - b.estimatedStart);

      // 4. Salvataggio persistente e aggiornamento metadati scene
      await updateProjectTimeline(finalEvents);
      
      for (const scene of scenesToAnalyze) {
        await updateSceneMetadata(scene.id, { 
          last_analyzed_content: cleanHtml(scene.content || '').trim() 
        });
      }

      addToast("Timeline aggiornata con successo.", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Errore durante l'analisi della timeline.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };



  const hasEvents = timelineEvents.length > 0;

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto selection:bg-[#5be9b1]/30">
      <header className="flex items-center justify-between bg-[#23282f] p-6 rounded-[32px] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5be9b1]/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCommit className="w-4 h-4 text-[#5be9b1]" />
            <span className="text-[10px] font-black text-[#5be9b1]/50 uppercase tracking-[0.3em]">Temporal Architecture</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter">Cronologia Narrativa</h1>
        </div>
        <div className="flex items-center gap-4">
          {hasEvents && (
             <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Eventi mappati</span>
                <span className="text-xl font-black text-[#5be9b1]">{timelineEvents.length}</span>
             </div>
          )}
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={cn(
              "flex items-center gap-3 px-8 py-4 bg-[#5be9b1] hover:bg-[#4ade80] text-[#0b0e11] text-xs font-black rounded-2xl shadow-xl shadow-[#5be9b1]/10 transition-all active:scale-95 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group",
              isAnalyzing && "animate-pulse"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
            {isAnalyzing ? 'Mapping Nexus...' : 'Sincronizza AI'}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 relative">
        {!hasEvents ? (
          <div className="h-full bg-[#171b1f] rounded-[40px] border border-white/5 p-8 flex flex-col items-center justify-center text-slate-500">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-[#5be9b1]/20 blur-3xl rounded-full animate-pulse" />
               <GitCommit className="w-20 h-20 text-[#5be9b1] relative z-10 opacity-40" />
            </div>
            <h3 className="text-xl font-black text-slate-300 mb-2">Motore Temporale Inattivo</h3>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black opacity-50 mb-8 max-w-sm text-center leading-relaxed">
              L'intelligenza artificiale deve analizzare la struttura del racconto per generare la mappa concettuale del tempo.
            </p>
            <div className="flex gap-10">
              <div className="flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#5be9b1]">
                    <Zap className="w-4 h-4" />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-widest">Estrazione</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[#5be9b1]">
                    <Clock className="w-4 h-4" />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-widest">Ordinamento</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-widest">Conflitti</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Timeline UI */}
            <div className="flex-1 overflow-x-auto pb-10 scrollbar-hide">
              <div className="inline-flex min-w-full h-full items-center px-12 relative">
                {/* Connecting Line */}
                <div className="absolute left-0 right-0 h-[2px] bg-white/5 top-1/2 -translate-y-1/2 z-0" />
                <div className="absolute left-0 right-0 h-[10px] bg-gradient-to-r from-transparent via-[#5be9b1]/5 to-transparent top-1/2 -translate-y-1/2 z-0" />

                <div className="flex items-center gap-16 relative z-10">
                  <AnimatePresence>
                    {timelineEvents.map((event, index) => {
                      const conflictTitles = event.conflictingWith?.map(id => 
                        timelineEvents.find(e => e.id === id)?.title
                      ).filter(Boolean) as string[];

                      return (
                        <TimelineNode 
                          key={event.id} 
                          event={event} 
                          index={index} 
                          conflictTitles={conflictTitles}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Bottom info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-2">
               <div className="bg-[#1a1e23] p-6 rounded-[32px] border border-white/5 flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-[#5be9b1]">
                     <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Coerenza Storica</div>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">L'AI verifica che la successione degli eventi rispetti la logica narrativa impostata.</p>
                  </div>
               </div>
               <div className="bg-[#1a1e23] p-6 rounded-[32px] border border-white/5 flex items-start gap-4">
                  <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                     <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Rilevamento Conflitti</div>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">Controlla se due personaggi si trovano in luoghi diversi nello stesso istante.</p>
                  </div>
               </div>
               <div className="bg-[#1a1e23] p-6 rounded-[32px] border border-white/5 flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                     <Info className="w-5 h-5" />
                  </div>
                  <div>
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Visualizzazione Sintetica</div>
                     <p className="text-xs text-slate-400 leading-relaxed font-medium">Una panoramica gerarchica degli eventi basata sulla loro importanza drammatica.</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TimelineNode: React.FC<{ 
  event: GlobalTimelineEvent, 
  index: number,
  conflictTitles?: string[]
}> = ({ event, index, conflictTitles }) => {

  const importanceStyles = {
    high: "border-t-4 border-t-[#5be9b1] h-[340px]",
    medium: "border-t-4 border-t-slate-500/20 h-[300px]",
    low: "border-t-4 border-t-slate-500/5 h-[260px]"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center group relative pt-20"
    >
      {/* Flashback Badge */}
      {event.isFlashback && (
        <div className="absolute top-8 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[8px] font-black text-purple-400 uppercase tracking-widest z-30">
          Analessi / Flashback
        </div>
      )}

      {/* Event Node Dot */}
      <div className={cn(
        "w-6 h-6 rounded-full border-4 border-[#1a1e23] z-20 transition-all duration-500 mb-8 shadow-xl group-hover:scale-125",
        event.isConflict ? "bg-red-500 shadow-red-500/40 animate-pulse" : 
        event.isFlashback ? "bg-purple-500 shadow-purple-500/40" : "bg-[#5be9b1] shadow-[#5be9b1]/40"
      )} />

      {/* Connection vertical line */}
      <div className={cn(
        "absolute top-[100px] w-[1px] bg-gradient-to-b from-slate-500/30 to-transparent",
        event.importance === 'high' ? 'h-[60px]' : event.importance === 'medium' ? 'h-[40px]' : 'h-[20px]'
      )} />

      {/* Card Content */}
      <div className={cn(
        "w-64 bg-[#23282f]/80 backdrop-blur-xl rounded-[32px] p-6 border border-white/5 relative transition-all duration-500 group-hover:-translate-y-2 group-hover:border-[#5be9b1]/20 shadow-2xl overflow-hidden",
        event.isConflict && "border-red-500/30 shadow-red-500/5",
        event.isFlashback && "border-purple-500/20",
        importanceStyles[event.importance]
      )}>
        {event.isConflict && (
           <div className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-xl shadow-lg animate-bounce z-10">
              <AlertTriangle className="w-4 h-4" />
           </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className={cn("w-3 h-3", event.isConflict ? "text-red-500" : "text-[#5be9b1]/50")} />
            <span className={cn("text-[8px] font-black uppercase tracking-widest", event.isConflict ? "text-red-500" : "text-[#5be9b1]/70")}>
              {event.timeLabel}
            </span>
          </div>
          {event.location && (
            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[80px]">
              @{event.location}
            </div>
          )}
        </div>

        <h4 className="text-sm font-black mb-2 tracking-tight text-slate-100 uppercase leading-snug">
          {event.title}
        </h4>
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-3 mb-4">
          {event.summary}
        </p>

        {event.characters && event.characters.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {event.characters.map((char, idx) => (
              <span key={idx} className="text-[8px] px-1.5 py-0.5 bg-white/5 rounded-md text-slate-500 font-bold">
                {char}
              </span>
            ))}
          </div>
        )}

        {event.isConflict && (
           <div className="mt-4 pt-4 border-t border-red-500/10">
              <div className="text-[8px] font-black uppercase text-red-500/80 tracking-widest mb-2">Conflitto con:</div>
              <div className="flex flex-col gap-1">
                {conflictTitles?.map((title, idx) => (
                  <p key={idx} className="text-[9px] text-red-400 font-bold leading-tight">
                    • {title}
                  </p>
                ))}
              </div>
           </div>
        )}

        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
           <ChevronRight className="w-4 h-4 text-[#5be9b1]" />
        </div>
      </div>
    </motion.div>
  );
};
