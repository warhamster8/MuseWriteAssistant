import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AISidekick } from './components/AISidekick';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
const NarrativeView = React.lazy(() => import('./views/NarrativeView').then(m => ({ default: m.NarrativeView })));
const CharactersView = React.lazy(() => import('./views/CharactersView').then(m => ({ default: m.CharactersView })));
const NotesView = React.lazy(() => import('./views/NotesView').then(m => ({ default: m.NotesView })));
const WorldView = React.lazy(() => import('./views/WorldView').then(m => ({ default: m.WorldView })));
const AnalysisView = React.lazy(() => import('./views/AnalysisView').then(m => ({ default: m.AnalysisView })));
const ConfigView = React.lazy(() => import('./views/ConfigView').then(m => ({ default: m.ConfigView })));
const AuthView = React.lazy(() => import('./views/AuthView').then(m => ({ default: m.AuthView })));
const ProjectSelector = React.lazy(() => import('./views/ProjectSelector').then(m => ({ default: m.ProjectSelector })));
const TimelineView = React.lazy(() => import('./views/TimelineView').then(m => ({ default: m.TimelineView })));
const DeepAnalysisView = React.lazy(() => import('./views/DeepAnalysisView').then(m => ({ default: m.DeepAnalysisView })));
import { AlertCircle, Cloud } from 'lucide-react';
import { ToastContainer } from './components/Toast';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const user = useStore(s => s.user);
  const currentProject = useStore(s => s.currentProject);
  const activeTab = useStore(s => s.activeTab);
  const setUser = useStore(s => s.setUser);
  const isZenMode = useStore(s => s.isZenMode);
  const isSidekickOpen = useStore(s => s.isSidekickOpen);
  const setAIConfig = useStore(s => s.setAIConfig);
  const theme = useStore(s => s.theme);
  const [showAuth, setShowAuth] = useState(false);
  const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL;

  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
          .select('deepseek_api_key, gemini_api_key, ai_settings')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setAIConfig({ 
            ...(data.ai_settings || {}),
            deepseekKey: data.deepseek_api_key,
            geminiKey: data.gemini_api_key
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
      case 'timeline':
        return <TimelineView />;
      case 'deep-analysis':
        return <DeepAnalysisView />;
      default:
        return <NarrativeView />;
    }
  };

  // 1. Landing Screen (Not logged in, Not in Auth view)
  if (!user && !showAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-deep)] p-4 selection:bg-[var(--accent-soft)]">
        <div className="bg-[var(--bg-card)]/90 backdrop-blur-3xl p-8 md:p-12 rounded-[40px] border border-[var(--border-subtle)] max-w-lg w-full text-center space-y-8 relative overflow-y-auto max-h-[95vh] shadow-premium scrollbar-hide">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[var(--accent)]/10 blur-[140px] rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[var(--accent)]/10 blur-[140px] rounded-full" />
          
          <div className="w-48 h-48 md:w-64 md:h-64 mx-auto rounded-[32px] bg-[var(--bg-surface)] flex items-center justify-center p-6 mb-6 logo-glow border border-[var(--border-subtle)] shadow-inner">
            <img src="/logo.png" alt="Project Muse Logo" className="w-full h-full object-contain logo-blend" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black font-display text-[var(--text-bright)] tracking-tighter leading-tight uppercase">Project Muse</h1>
            <p className="text-[var(--text-secondary)] mt-2 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-2">L'architetto della tua visione narrativa</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 px-4 md:px-10">
             <button 
                onClick={() => setShowAuth(true)}
                className="group relative w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--bg-deep)] rounded-[24px] text-base md:text-lg font-black transition-all shadow-2xl shadow-[var(--accent-soft)] flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-[var(--accent-soft)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Cloud className="w-6 h-6 transition-transform group-hover:scale-110" />
                Accedi alla Libreria
              </button>
          </div>

          <div className="bg-[var(--bg-card)]/40 border border-[var(--border-subtle)] p-6 md:p-8 rounded-[32px] text-left space-y-3 mx-4 md:mx-10">
             <div className="flex items-center gap-2 text-[var(--accent)]/50">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Restricted Core</span>
             </div>
             <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-black uppercase tracking-widest">
               QUESTO PORTALE È CONFIGURATO PER L'ACCESSO ESCLUSIVO. <br/>
               CONFIGURAZIONE DI SICUREZZA: <span className="text-[var(--accent)]/50">LEVEL 4 ENCRYPTION</span>.
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
    <div className="flex h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] font-sans overflow-hidden relative">
      {/* Background Atmosphere Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none opacity-40" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent)]/3 blur-[120px] rounded-full pointer-events-none opacity-30" />
      <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />
      
      <ErrorBoundary>
        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="z-30 h-full flex-shrink-0"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>
        
        <main className="flex-1 h-full p-2 lg:p-4 overflow-hidden flex flex-col relative min-w-0">
          <div className="flex-1 min-h-0 h-full">
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-full text-[var(--text-muted)] animate-pulse font-black uppercase tracking-[0.4em] text-[10px]">
                Sincronizzazione Modulo...
              </div>
            }>
              {renderView()}
            </React.Suspense>
          </div>
        </main>
        
        <AnimatePresence>
          {activeTab === 'narrative' && isSidekickOpen && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="z-20 h-full flex-shrink-0 relative border-l border-[var(--border-subtle)] shadow-2xl"
            >
              <AISidekick />
            </motion.div>
          )}
        </AnimatePresence>
      </ErrorBoundary>
      <ToastContainer />
    </div>
  );
}

export default App;
