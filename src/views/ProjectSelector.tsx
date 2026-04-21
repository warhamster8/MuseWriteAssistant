import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { useStore } from '../store/useStore';
import { LogOut, Loader2, PlusCircle } from 'lucide-react';
import { NewProjectCard } from './projects/NewProjectCard';
import { ProjectCard } from './projects/ProjectCard';

/**
 * Componente: ProjectSelector
 * 
 * Perché esiste: Funge da dashboard iniziale per la scelta dell'opera su cui lavorare.
 * Cosa fa: Coordina il recupero dei progetti dal database (o storage locale) e gestisce la creazione/eliminazione.
 */
export const ProjectSelector: React.FC = () => {
  const { user, isLocalMode, setCurrentProject, logout } = useStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Recupera la lista delle opere basandosi sulla modalità (Cloud o Locale).
   */
  const fetchProjects = async () => {
    setLoading(true);
    try {
      if (isLocalMode) {
        const localProjs = storage.getCollection('projects');
        setProjects(localProjs);
      } else if (user) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) setProjects(data || []);
      }
    } catch (err) {
      console.error('[SECURITY LOG] Project Fetch Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user, isLocalMode]);

  /**
   * Handler: Creazione nuova opera.
   */
  const handleCreate = async (title: string) => {
    setLoading(true);
    try {
      if (isLocalMode) {
        const newProj = storage.insert('projects', { title });
        setCurrentProject({ id: newProj.id, title: newProj.title });
      } else if (user) {
        const { data, error } = await supabase
          .from('projects')
          .insert([{ user_id: user.id, title }])
          .select()
          .single();
        
        if (error) throw error;
        if (data) setCurrentProject({ id: data.id, title: data.title });
      }
    } catch (err: any) {
      console.error('[SECURITY LOG] Project Creation Error:', err.message);
      alert('Impossibile inizializzare la nuova opera. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handler: Eliminazione opera con conferma di sicurezza.
   */
  const handleDelete = async (id: string) => {
    if (!confirm('ATTENZIONE: Sei sicuro di voler eliminare definitivamente questo progetto? Tutti i dati (capitoli, scene, note) verranno rimossi irrevocabilmente.')) return;

    try {
      if (isLocalMode) {
        storage.delete('projects', id);
        fetchProjects();
      } else {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        fetchProjects();
      }
    } catch (err: any) {
      console.error('[SECURITY LOG] Project Deletion Error:', err.message);
      alert('Errore durante l\'eliminazione dell\'opera.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8 selection:bg-[#5be9b1]/30 overflow-y-auto scrollbar-hide">
      <div className="max-w-6xl w-full space-y-12 py-12 animate-in fade-in zoom-in duration-1000">
        
        {/* Archivio Header (Mattoncino integrato) */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white/[0.02] p-10 rounded-[48px] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-8">
            <div className="relative group">
                <div className="absolute -inset-4 bg-[#5be9b1]/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <img src="/logo.png" alt="Muse Logo" className="relative w-24 h-24 object-contain transition-transform duration-700 group-hover:scale-110 shadow-emerald-500/20 shadow-2xl" />
            </div>
            <div>
              <h1 className="text-5xl font-medium font-display tracking-tighter text-white">Archivio Opere</h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">
                {isLocalMode ? 'Core Locale Attivo / Persistenza Browser' : `Bentornato Architetto / ${user?.email}`}
              </p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center gap-4 px-8 py-4 bg-white/[0.05] hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-[24px] transition-all border border-white/5 active:scale-95 group"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Disconnetti Core</span>
          </button>
        </div>

        {/* Griglia Opere */}
        {loading && projects.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-6">
            <div className="p-6 bg-[#5be9b1]/10 rounded-3xl border border-[#5be9b1]/20 animate-pulse">
                <Loader2 className="w-10 h-10 text-[#5be9b1] animate-spin" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#5be9b1]/50 animate-pulse">Sincronizzazione Indice...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Mattoncino: Creazione */}
            <NewProjectCard onCreate={handleCreate} />

            {/* Mattoncini: Progetti Esistenti */}
            {projects.map((proj) => (
              <ProjectCard 
                key={proj.id}
                project={proj}
                onSelect={() => setCurrentProject({ id: proj.id, title: proj.title })}
                onDelete={(e) => {
                  e.stopPropagation();
                  handleDelete(proj.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Empty State (Nessuna opera trovata) */}
        {projects.length === 0 && !loading && (
          <div className="text-center py-24 bg-white/[0.01] rounded-[48px] border border-dashed border-white/5 animate-in fade-in duration-1000">
            <PlusCircle className="w-16 h-16 text-slate-800 mx-auto mb-6 opacity-20" />
            <div className="space-y-2">
                <p className="text-xl font-medium text-slate-500 tracking-tight">Il manoscritto è ancora una pagina bianca</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">Clicca su 'Nuova Opera' per iniziare a plasmare la tua storia</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

