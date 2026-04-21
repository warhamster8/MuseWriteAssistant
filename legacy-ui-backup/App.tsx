import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AISidekick } from './components/AISidekick';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { NarrativeView } from './views/NarrativeView';
import { CharactersView } from './views/CharactersView';
import { NotesView } from './views/NotesView';
import { WorldView } from './views/WorldView';
import { AuthView } from './views/AuthView';
import { ProjectSelector } from './views/ProjectSelector';
import { AnalysisView } from './views/AnalysisView';
import { ConfigView } from './views/ConfigView';
import { AlertCircle, Cloud } from 'lucide-react';
import { ToastContainer } from './components/Toast';

function App() {
  const { user, currentProject, activeTab, setUser, setAIConfig } = useStore();
  const [showAuth, setShowAuth] = useState(false);
  const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Controllo sicurezza email
        if (ALLOWED_EMAIL && session.user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
          supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser({ id: session.user.id, email: session.user.email });
        setShowAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (ALLOWED_EMAIL && session.user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
          supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser({ id: session.user.id, email: session.user.email });
        setShowAuth(false);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, ALLOWED_EMAIL]);

  // Caricamento profilo (chiave Gemini e Impostazioni AI)
  React.useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('deepseek_api_key, ai_settings')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setAIConfig({ 
            ...(data.ai_settings || {}),
            deepseekKey: data.deepseek_api_key
          });
        }
      };
      fetchProfile();
    }
  }, [user, setAIConfig]);

  const renderView = () => {
    switch (activeTab) {
      case 'narrative':
        return <NarrativeView />;
      case 'characters':
        return <CharactersView />;
      case 'world':
        return <WorldView />;
      case 'notes':
        return <NotesView />;
      case 'config':
        return <ConfigView />;
      case 'analysis':
        return <AnalysisView />;
      default:
        return <NarrativeView />;
    }
  };

  // 1. Landing Screen (Not logged in, Not in Auth view)
  if (!user && !showAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="glass p-12 rounded-3xl border border-slate-700 max-w-lg w-full text-center space-y-8 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 blur-3xl rounded-full" />
          
          <div className="w-48 h-48 mx-auto rounded-full glass flex items-center justify-center p-4 mb-8 logo-glow border-white/5">
            <img src="/logo.png" alt="Project Muse Logo" className="w-full h-full object-contain logo-blend" />
          </div>
          <div>
            <h1 className="text-4xl font-bold font-display bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">Project Muse</h1>
            <p className="text-slate-400 mt-2 text-lg">Il tuo architetto narrativo privato</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
             <button 
                onClick={() => setShowAuth(true)}
                className="group relative w-full py-5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 rounded-2xl text-lg font-bold transition-all shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Cloud className="w-6 h-6" />
                Accedi alla tua Libreria
              </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-left space-y-2">
             <div className="flex items-center gap-2 text-slate-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Accesso Riservato</span>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed">
               Questa istanza è protetta. Se non sei il proprietario, puoi scaricare il codice sorgente su GitHub per creare la tua versione.
             </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Auth Screen
  if (showAuth && !user) {
    return <AuthView onBack={() => setShowAuth(false)} />;
  }

  // 3. Project Selection Screen (Logged in but no project selected)
  if (user && !currentProject) {
    return <ProjectSelector />;
  }

  // 4. Main App Dashboard
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <ErrorBoundary>
        <Sidebar />
        <main className="flex-1 h-screen p-6 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
            {renderView()}
          </div>
        </main>
        
        {activeTab === 'narrative' && <AISidekick />}
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
}

export default App;
