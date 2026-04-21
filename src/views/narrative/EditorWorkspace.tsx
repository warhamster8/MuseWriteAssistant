import React from 'react';
import { Sparkles, Maximize2, Minimize2, LayoutList } from 'lucide-react';
import { Editor } from '../../components/Editor';
import type { Scene } from '../../types/narrative';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface EditorWorkspaceProps {
  activeScene: Scene | undefined;
  onUpdateContent: (id: string, html: string) => void;
}

/**
 * Mattoncino: EditorWorkspace
 * 
 * Perché esiste: Isola il componente Editor e la relativa UI di controllo.
 * Cosa fa: Mostra l'editor se c'è una scena attiva, altrimenti mostra uno stato vuoto (Empty State).
 */
export const EditorWorkspace: React.FC<EditorWorkspaceProps> = React.memo(({
  activeScene,
  onUpdateContent
}) => {
  const isSidekickOpen = useStore(s => s.isSidekickOpen);
  const setSidekickOpen = useStore(s => s.setSidekickOpen);
  const isNavigatorOpen = useStore(s => s.isNavigatorOpen);
  const setNavigatorOpen = useStore(s => s.setNavigatorOpen);
  const isZenMode = useStore(s => s.isZenMode);
  const setZenMode = useStore(s => s.setZenMode);

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#111418] relative overflow-hidden animate-in fade-in duration-500">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#5be9b1]/5 blur-[100px] pointer-events-none" />

      {/* Toolbar Premium (Sempre visibile per controlli layout) */}
      <div className="h-20 bg-white/[0.01] border-b border-white/10 flex items-center justify-between px-10 backdrop-blur-md z-10">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[#5be9b1] uppercase tracking-[0.4em] mb-1">
              {activeScene ? 'Editing Mode' : 'Navigation Mode'}
            </span>
            <h2 className="text-xl font-black text-slate-100 tracking-tighter uppercase truncate max-w-[300px]">
              {activeScene ? activeScene.title : 'Seleziona Manoscritto'}
            </h2>
          </div>
          {activeScene && (
            <>
              <div className="h-8 w-[1px] bg-white/5 mx-2" />
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 bg-[#5be9b1] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">Live Sync</span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setNavigatorOpen(!isNavigatorOpen)}
            className={cn(
              "p-3 rounded-2xl transition-all border active:scale-95 group",
              isNavigatorOpen 
                ? "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300" 
                : "bg-[#5be9b1]/10 border-[#5be9b1]/30 text-[#5be9b1] shadow-[0_0_20px_rgba(91,233,177,0.1)]"
            )}
            title={isNavigatorOpen ? "Nascondi Navigatore" : "Mostra Navigatore"}
          >
            <LayoutList className="w-5 h-5 flex-shrink-0" />
          </button>

          <button 
            onClick={() => {
              const newZen = !isZenMode;
              setZenMode(newZen);
              if (newZen) setSidekickOpen(false);
            }}
            className={cn(
              "p-3 rounded-2xl transition-all border active:scale-95 group",
              isZenMode 
                ? "bg-[#5be9b1]/10 border-[#5be9b1]/30 text-[#5be9b1] shadow-[0_0_20px_rgba(91,233,177,0.1)]" 
                : "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300"
            )}
            title={isZenMode ? "Esci da Modalità Zen" : "Modalità Zen"}
          >
            {isZenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          
          <div className="h-8 w-[1px] bg-white/5 mx-1" />
                  {activeScene ? (
             <button 
                onClick={() => setSidekickOpen(!isSidekickOpen)}
                className={cn(
                  "flex items-center gap-3 px-4 xl:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl group",
                  "bg-[#5be9b1] text-[#0b0e11] hover:scale-105 shadow-[0_10px_30px_-5px_rgba(91,233,177,0.3)]"
                )}
              >
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">AI Sidekick</span>
              </button>
          ) : (
            <button 
              onClick={() => setSidekickOpen(!isSidekickOpen)}
              className={cn(
                "p-3 rounded-2xl transition-all border active:scale-95 group focus:outline-none",
                isSidekickOpen 
                  ? "bg-white/5 border-white/5 text-slate-500 hover:text-slate-300" 
                  : "bg-[#5be9b1]/10 border-[#5be9b1]/30 text-[#5be9b1] shadow-[0_0_20px_rgba(91,233,177,0.1)]"
              )}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!activeScene ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-6 bg-[#121519]/10 animate-in fade-in duration-500">
            <div 
              onClick={() => setNavigatorOpen(true)}
              className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center opacity-20 bg-white/5 transition-all hover:scale-110 hover:opacity-40 cursor-pointer group"
            >
              <LayoutList className="w-10 h-10 group-hover:text-[#5be9b1] transition-colors" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-medium text-slate-400">Pronto per scrivere?</h3>
                <p className="text-xs opacity-50 max-w-[200px] mx-auto mt-2 tracking-wide font-light">
                  Apri la libreria a sinistra per selezionare una scena o iniziarne una nuova.
                </p>
                <button 
                  onClick={() => setNavigatorOpen(true)}
                  className="mt-6 px-6 py-2 bg-white/5 hover:bg-[#5be9b1]/10 text-white/40 hover:text-[#5be9b1] border border-white/5 hover:border-[#5be9b1]/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Mostra Libreria
                </button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-12 bg-[#0b0e11]">
            <div className="mx-auto w-full max-w-[1200px]">
              <Editor 
                initialContent={activeScene.content || ''} 
                onChange={(newContent) => onUpdateContent(activeScene.id, newContent)} 
              />
              
              <div className="mt-16 pt-10 border-t border-white/5 flex items-center justify-between opacity-30">
                <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-[0.3em] text-slate-600">
                  <span>Scene ID: {activeScene.id.slice(0, 8)}</span>
                  <span className="w-1 h-1 bg-slate-800 rounded-full" />
                  <span>Last Edit: Just now</span>
                </div>
                <button 
                  onClick={() => setSidekickOpen(!isSidekickOpen)}
                  className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.3em] text-[#5be9b1] hover:opacity-100 transition-opacity"
                >
                  <Sparkles className="w-3 h-3" />
                  Focus Deep Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
