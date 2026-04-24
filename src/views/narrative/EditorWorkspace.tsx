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
    <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-surface)] relative overflow-hidden animate-in fade-in duration-500 rounded-[40px] border border-[var(--border-subtle)] shadow-sm">
      {/* Background Decorative Element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 blur-[100px] pointer-events-none opacity-50" />

      {/* Toolbar Premium (Sempre visibile per controlli layout) */}
      <div className="sticky top-0 h-20 bg-[var(--bg-card)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between px-10 backdrop-blur-xl z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-[var(--accent)] uppercase tracking-[0.4em] mb-1">
              {activeScene ? 'Editing Mode' : 'Navigation Mode'}
            </span>
            <h2 className="text-xl font-black text-[var(--text-bright)] tracking-tighter uppercase truncate max-w-[300px]">
              {activeScene ? activeScene.title : 'Seleziona Manoscritto'}
            </h2>
          </div>
          {activeScene && (
            <>
              <div className="h-8 w-[1px] bg-[var(--border-subtle)] mx-2" />
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-soft)] rounded-full border border-[var(--border-subtle)]">
                <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest hidden sm:inline">Live Sync</span>
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
                ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-bright)]" 
                : "bg-[var(--accent-soft)] border-[var(--accent)]/30 text-[var(--accent)] shadow-glow-mint"
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
                ? "bg-[var(--accent-soft)] border-[var(--accent)]/30 text-[var(--accent)] shadow-glow-mint" 
                : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
            )}
            title={isZenMode ? "Esci da Modalità Zen" : "Modalità Zen"}
          >
            {isZenMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          
          <div className="h-8 w-[1px] bg-[var(--border-subtle)] mx-1" />
                  {activeScene ? (
             <button 
                onClick={() => setSidekickOpen(!isSidekickOpen)}
                className={cn(
                  "flex items-center gap-3 px-4 xl:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl group",
                  "bg-[var(--accent)] text-[var(--bg-deep)] hover:scale-105 shadow-glow-mint"
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
                  ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-bright)]" 
                  : "bg-[var(--accent-soft)] border-[var(--accent)]/30 text-[var(--accent)] shadow-glow-mint"
              )}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {!activeScene ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] space-y-6 bg-[var(--bg-deep)]/10 animate-in fade-in duration-500">
            <div 
              onClick={() => setNavigatorOpen(true)}
              className="w-24 h-24 rounded-full border border-[var(--border-subtle)] flex items-center justify-center opacity-20 bg-[var(--bg-surface)] transition-all hover:scale-110 hover:opacity-40 cursor-pointer group"
            >
              <LayoutList className="w-10 h-10 group-hover:text-[var(--accent)] transition-colors" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-medium text-[var(--text-bright)]">Pronto per scrivere?</h3>
                <p className="text-xs opacity-50 max-w-[200px] mx-auto mt-2 tracking-wide font-light">
                  Apri la libreria a sinistra per selezionare una scena o iniziarne una nuova.
                </p>
                <button 
                  onClick={() => setNavigatorOpen(true)}
                  className="mt-6 px-6 py-2 bg-[var(--bg-surface)]/50 hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Mostra Libreria
                </button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar bg-[var(--bg-deep)] transition-colors duration-500">
            <div className="mx-auto w-full max-w-[1200px] p-4 lg:p-8 2xl:p-12">
              <Editor 
                initialContent={activeScene.content || ''} 
                onChange={(newContent) => onUpdateContent(activeScene.id, newContent)} 
              />
              
              <div className="mt-16 pt-10 border-t border-[var(--border-subtle)] flex items-center justify-between opacity-30">
                <div className="flex items-center gap-4 text-[10px] uppercase font-black tracking-[0.3em] text-[var(--text-muted)]">
                  <span>Scene ID: {activeScene.id.slice(0, 8)}</span>
                  <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full" />
                  <span>Last Edit: Just now</span>
                </div>
                <button 
                  onClick={() => setSidekickOpen(!isSidekickOpen)}
                  className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.3em] text-[var(--accent)] hover:opacity-100 transition-opacity"
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
