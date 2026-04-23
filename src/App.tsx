import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AISidekick } from './components/AISidekick';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store/useStore';
import { supabase, isConfigured } from './lib/supabase';
import { lazyRetry } from './lib/lazyRetry';

const NarrativeView = lazyRetry(() => import('./views/NarrativeView').then(m => ({ default: m.NarrativeView })), 'NarrativeView');
const CharactersView = lazyRetry(() => import('./views/CharactersView').then(m => ({ default: m.CharactersView })), 'CharactersView');
const NotesView = lazyRetry(() => import('./views/NotesView').then(m => ({ default: m.NotesView })), 'NotesView');
const WorldView = lazyRetry(() => import('./views/WorldView').then(m => ({ default: m.WorldView })), 'WorldView');
const AnalysisView = lazyRetry(() => import('./views/AnalysisView').then(m => ({ default: m.AnalysisView })), 'AnalysisView');
const ConfigView = lazyRetry(() => import('./views/ConfigView').then(m => ({ default: m.ConfigView })), 'ConfigView');
const AuthView = lazyRetry(() => import('./views/AuthView').then(m => ({ default: m.AuthView })), 'AuthView');
const ProjectSelector = lazyRetry(() => import('./views/ProjectSelector').then(m => ({ default: m.ProjectSelector })), 'ProjectSelector');
const TimelineView = lazyRetry(() => import('./views/TimelineView').then(m => ({ default: m.TimelineView })), 'TimelineView');
const DeepAnalysisView = lazyRetry(() => import('./views/DeepAnalysisView').then(m => ({ default: m.DeepAnalysisView })), 'DeepAnalysisView');
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

  // Diagnostic check for missing environment variables
  if (!isConfigured) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-deep)] p-10 font-sans selection:bg-[var(--accent-soft)]">
        <div className="bg-[var(--bg-card)] p-12 rounded-3xl border border-red-500/20 max-w-xl text-center space-y-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-red-500/30" />
           <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-500" />
           </div>
           <div>
             <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Errore di Configurazione</h1>
             <p className="text-slate-400 mt-4 text-xs font-black uppercase tracking-[0.2em] leading-relaxed">
               Le variabili d'ambiente di Supabase non sono state rilevate nel sistema.
             </p>
           </div>
           <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4 text-left">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose">
                Assicurati di aver configurato nella dashboard di Cloudflare Pages:
              </p>
              <code className="block text-[10px] text-emerald-400 font-mono bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                 VITE_SUPABASE_URL <br/>
                 VITE_SUPABASE_ANON_KEY
              </code>
           </div>
           <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">
             Sincronizzazione Fallita • Muse Core Architecture
           </p>
        </div>
      </div>
    );
  }

  React.useEffect(() => {
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data: { session } }: any) => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
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
        if (!supabase) return;
        const { data, error } = await supabase
          .from('user_profiles')
          .select('deepseek_api_key, gemini_api_key, ai_settings')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          const savedSettings = data.ai_settings || {};
          // Guard: normalize stale Gemini model strings that are no longer valid
          const VALID_GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-001', 'gemini-2.5-flash', 'gemini-pro-latest'];
          if (savedSettings.provider === 'gemini' && savedSettings.model && !VALID_GEMINI_MODELS.includes(savedSettings.model)) {
            savedSettings.model = 'gemini-flash-latest';
          }
          setAIConfig({ 
            ...savedSettings,
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
        <div className="bg-[var(--bg-card)]/90 backdrop-blur-3xl p-8 md:p-12 rounded-3xl border border-[var(--border-subtle)] max-w-lg w-full text-center space-y-8 relative overflow-y-auto max-h-[95vh] shadow-premium scrollbar-hide">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[var(--accent)]/10 blur-[140px] rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[var(--accent)]/10 blur-[140px] rounded-full" />
          
          <div className="w-48 h-48 md:w-64 md:h-64 mx-auto rounded-[48px] bg-[var(--bg-surface)] flex items-center justify-center p-6 mb-6 logo-glow border border-[var(--border-subtle)] shadow-inner">
            <img src="/logo.png" alt="Project Muse Logo" className="w-full h-full object-contain rounded-[24px] md:rounded-[32px] logo-blend" />
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
    <div className="flex flex-col-reverse md:flex-row h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] font-sans overflow-hidden relative">
      {/* Background Atmosphere Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent)]/5 blur-[120px] rounded-full pointer-events-none opacity-40" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent)]/3 blur-[120px] rounded-full pointer-events-none opacity-30" />
      <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />
      
      <ErrorBoundary>
        <AnimatePresence>
          {!isZenMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="z-50 w-full md:w-auto h-auto md:h-full flex-shrink-0 order-last md:order-none"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>
        
        <main className="flex-1 h-full p-0 md:p-2 lg:p-4 overflow-hidden flex flex-col relative min-w-0 order-1 md:order-none">
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="z-40 h-full flex-shrink-0 absolute md:relative right-0 border-l border-[var(--border-subtle)] shadow-2xl bg-[var(--bg-deep)] md:bg-transparent"
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
