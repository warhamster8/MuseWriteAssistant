import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NewProjectCardProps {
  onCreate: (title: string) => void;
}

/**
 * Mattoncino: NewProjectCard
 * 
 * Perché esiste: Separa la logica del form di creazione dalla griglia dei progetti esistenti.
 * Cosa fa: Alterna tra un pulsante di invito all'azione e un form di inserimento titolo.
 */
export const NewProjectCard: React.FC<NewProjectCardProps> = ({ onCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreate(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
    }
  };

  return (
    <div 
      className={cn(
        "group relative min-h-[320px] rounded-[64px] border-2 border-dashed transition-all duration-700 p-12 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden shadow-sm hover:shadow-2xl",
        isCreating 
          ? "border-[#5be9b1]/50 bg-[#5be9b1]/5" 
          : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-[#5be9b1]/20"
      )}
      onClick={() => !isCreating && setIsCreating(true)}
    >
      {/* Elemento decorativo di sfondo */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#5be9b1]/5 blur-[80px] rounded-full -mr-24 -mt-24 group-hover:bg-[#5be9b1]/10 transition-all duration-700" />
      
      {isCreating ? (
        <form onSubmit={handleSubmit} className="w-full space-y-6 relative z-10 animate-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-[#5be9b1]/60 uppercase tracking-[0.4em]">Inizializza Architettura</label>
            <input 
              autoFocus
              className="w-full bg-black/40 border border-white/5 rounded-[24px] px-8 py-5 text-sm text-white focus:outline-none focus:border-[#5be9b1]/50 transition-all shadow-inner placeholder:text-slate-800"
              placeholder="Inserisci Titolo..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsCreating(false)}
            />
          </div>
          <div className="flex gap-4">
            <button 
              type="submit"
              className="flex-1 py-4 bg-[#5be9b1] hover:bg-opacity-90 rounded-[20px] text-[#0b0e11] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
            >
              Crea Progetto
            </button>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsCreating(false); }}
              className="px-6 py-4 glass rounded-[20px] text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-all"
            >
              Annulla
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="p-8 bg-white/5 rounded-[40px] border border-white/5 group-hover:border-[#5be9b1]/30 group-hover:bg-[#5be9b1]/10 transition-all duration-500 shadow-inner group-hover:scale-110">
            <Plus className="w-10 h-10 text-slate-700 group-hover:text-[#5be9b1] transition-colors" />
          </div>
          <div className="mt-8 space-y-2">
            <span className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] group-hover:text-[#5be9b1] transition-colors">Nuova Opera</span>
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500">Espandi il tuo universo narrativo</p>
          </div>
        </>
      )}
    </div>
  );
};
