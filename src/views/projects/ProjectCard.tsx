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
      className="group relative min-h-[320px] rounded-[64px] glass border border-white/5 hover:border-[#5be9b1]/30 p-12 flex flex-col justify-between cursor-pointer transition-all duration-700 hover:-translate-y-4 shadow-2xl hover:shadow-[0_40px_80px_-20px_rgba(16,185,129,0.2)] overflow-hidden"
    >
      {/* Background Decorative Gradient */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#5be9b1]/5 blur-[80px] rounded-full group-hover:bg-[#5be9b1]/10 transition-all duration-700" />

      <div className="relative space-y-6">
        <div className="flex items-center justify-between">
          {/* Badge Decorativo */}
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-[#5be9b1]/10 group-hover:border-[#5be9b1]/30 transition-all duration-500 shadow-xl">
              <Sparkles className="w-4 h-4 text-slate-500 group-hover:text-[#5be9b1] group-hover:scale-125 transition-all duration-500" />
          </div>
          
          <div className="flex items-center gap-4">
              {/* Pulsante Eliminazione */}
              <button 
                onClick={onDelete}
                className="p-3 text-slate-800 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20 translate-y-2 group-hover:translate-y-0"
                title="Elimina Progetto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="p-4 bg-black/20 rounded-[24px] border border-white/5 group-hover:border-[#5be9b1]/20 transition-all duration-500">
                  <Clock className="w-4 h-4 text-slate-700 group-hover:text-[#5be9b1]/50" />
              </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[#5be9b1]/40 uppercase font-black tracking-[0.4em] mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700">Manuscript Archive</p>
          <h3 className="text-4xl font-black font-display leading-tight text-white tracking-tighter group-hover:text-[#5be9b1] transition-all duration-500">
            {project.title}
          </h3>
        </div>
      </div>
      
      <div className="relative flex items-center justify-between mt-8">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-black group-hover:text-slate-400 transition-colors">
            Ready for Analysis
          </span>
          <div className="h-1 w-12 bg-white/5 rounded-full mt-2 overflow-hidden">
            <div className="h-full w-0 group-hover:w-full bg-[#5be9b1]/50 transition-all duration-1000" />
          </div>
        </div>
        <div className="p-5 glass-emerald border border-white/5 rounded-[32px] group-hover:bg-[#5be9b1] group-hover:text-[#0b0e11] transition-all duration-500 shadow-inner group-hover:shadow-[0_15px_40px_-10px_rgba(16,185,129,0.5)] group-hover:scale-110 active:scale-95">
          <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-[#0b0e11] transition-all duration-500" />
        </div>
      </div>
    </div>
  );
};
