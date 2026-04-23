import React from 'react';
import { Clock, ChevronRight, Sparkles, Trash2 } from 'lucide-react';

interface ProjectCardProps {
  project: { id: string; title: string };
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

/**
 * Mattoncino: ProjectCard
 * 
 * Perché esiste: Isola lo stile e le interazioni di una singola opera nell'archivio.
 * Cosa fa: Visualizza il titolo del progetto, lo stato di sincronizzazione e permette l'accesso o l'eliminazione.
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onDelete
}) => {
  return (
    <div 
      onClick={onSelect}
      className="group relative min-h-[320px] rounded-3xl glass border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 p-12 flex flex-col justify-between cursor-pointer transition-all duration-700 hover:-translate-y-4 shadow-2xl overflow-hidden"
    >
      {/* Background Decorative Gradient */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent)]/5 blur-[80px] rounded-full group-hover:bg-[var(--accent)]/10 transition-all duration-700" />

      <div className="relative space-y-6">
        <div className="flex items-center justify-between">
          {/* Badge Decorativo */}
          <div className="p-3 bg-[var(--bg-surface)]/10 rounded-2xl border border-[var(--border-subtle)] group-hover:bg-[var(--accent-soft)] group-hover:border-[var(--accent)]/30 transition-all duration-500 shadow-xl">
              <Sparkles className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:scale-125 transition-all duration-500" />
          </div>
          
          <div className="flex items-center gap-4">
              {/* Pulsante Eliminazione */}
              <button 
                onClick={onDelete}
                className="p-3 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20 translate-y-2 group-hover:translate-y-0"
                title="Elimina Progetto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="p-4 bg-[var(--bg-deep)]/20 rounded-[24px] border border-[var(--border-subtle)] group-hover:border-[var(--accent)]/20 transition-all duration-500">
                  <Clock className="w-4 h-4 text-[var(--text-muted)]/50 group-hover:text-[var(--accent)]/50" />
              </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[var(--accent)]/40 uppercase font-black tracking-[0.4em] mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700">Manuscript Archive</p>
          <h3 className="text-4xl font-black font-display leading-tight text-[var(--text-bright)] tracking-tighter group-hover:text-[var(--accent)] transition-all duration-500">
            {project.title}
          </h3>
        </div>
      </div>
      
      <div className="relative flex items-center justify-between mt-8">
        <div className="flex flex-col">
          <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-black group-hover:text-[var(--text-secondary)] transition-colors">
            Ready for Analysis
          </span>
          <div className="h-1 w-12 bg-[var(--border-subtle)] rounded-full mt-2 overflow-hidden">
            <div className="h-full w-0 group-hover:w-full bg-[var(--accent)]/50 transition-all duration-1000" />
          </div>
        </div>
        <div className="p-5 glass border border-[var(--border-subtle)] rounded-[32px] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-deep)] transition-all duration-500 shadow-inner group-hover:scale-110 active:scale-95">
          <ChevronRight className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--bg-deep)] transition-all duration-500" />
        </div>
      </div>
    </div>
  );
};
