import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { useStore } from '../store/useStore';
import { Plus, Clock, ChevronRight, LogOut, Loader2, Sparkles, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

export const ProjectSelector: React.FC = () => {
  const { user, isLocalMode, setCurrentProject, logout } = useStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user, isLocalMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    setLoading(true);
    if (isLocalMode) {
      const newProj = storage.insert('projects', { title: newTitle });
      setCurrentProject({ id: newProj.id, title: newProj.title });
    } else if (user) {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ user_id: user.id, title: newTitle }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating project:', error);
        alert('Errore nella creazione del progetto: ' + error.message);
      } else if (data) {
        setCurrentProject({ id: data.id, title: data.title });
      }
    }
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Sei sicuro di voler eliminare questo progetto? Tutti i dati associati verranno persi.')) return;

    if (isLocalMode) {
      storage.delete('projects', id);
      fetchProjects();
    } else {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) alert('Errore nell\'eliminazione: ' + error.message);
      else fetchProjects();
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Muse Logo" className="w-16 h-16 object-contain shadow-2xl shadow-blue-500/20 rounded-xl" />
            <div>
              <h1 className="text-3xl font-bold font-serif">I Miei Romanzi</h1>
              <p className="text-slate-500 text-sm">
                {isLocalMode ? 'Modalità Locale (Salvataggio nel browser)' : `Bentornato, ${user?.email}`}
              </p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Esci</span>
          </button>
        </div>

        {loading && !isCreating ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Card */}
            <div 
              className={cn(
                "group relative h-48 rounded-3xl border-2 border-dashed transition-all p-6 flex flex-col items-center justify-center text-center cursor-pointer",
                isCreating 
                  ? "border-blue-500 bg-blue-500/5 shadow-inner" 
                  : "border-slate-800 hover:border-slate-600 bg-slate-900/20 hover:bg-slate-900/40"
              )}
              onClick={() => !isCreating && setIsCreating(true)}
            >
              {isCreating ? (
                <form onSubmit={handleCreate} className="w-full space-y-4">
                  <input 
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Titolo del romanzo..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      className="flex-1 py-2 bg-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500"
                    >
                      Crea
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setIsCreating(false); }}
                      className="px-3 py-2 bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-700"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="p-3 bg-slate-800 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6 text-slate-400" />
                  </div>
                  <span className="font-bold text-slate-300">Nuova Opera</span>
                  <span className="text-xs text-slate-500 mt-1">Inizia a scrivere oggi</span>
                </>
              )}
            </div>

            {/* Project Cards */}
            {projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => setCurrentProject({ id: proj.id, title: proj.title })}
                className="group relative h-48 rounded-3xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 p-8 flex flex-col justify-between cursor-pointer transition-all hover:border-slate-600 hover:-translate-y-1 shadow-xl hover:shadow-blue-500/5"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Sparkles className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button 
                      onClick={(e) => handleDelete(e, proj.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Elimina Progetto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Clock className="w-3 h-3 text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold font-serif leading-tight">{proj.title}</h3>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ultima modifica: Recente</span>
                  <div className="p-2 bg-slate-800 rounded-full group-hover:bg-blue-600 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {projects.length === 0 && !loading && !isCreating && (
          <div className="text-center py-12 glass rounded-3xl border border-slate-800">
            <PlusCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">Non hai ancora creato alcun romanzo. Clicca sul box per iniziare!</p>
          </div>
        )}
      </div>
    </div>
  );
};

