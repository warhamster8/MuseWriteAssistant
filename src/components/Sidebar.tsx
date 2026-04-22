import React from 'react';
import { 
  Users, 
  Globe, 
  BookOpen, 
  BarChart2, 
  Settings, 
  LogOut,
  ChevronRight,
  StickyNote,
  Library,
  GitCommit,
  ScanSearch,
  Sun,
  Moon
} from 'lucide-react';
import { useStore, type ViewTab } from '../store/useStore';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type NavItem = {
  id: ViewTab;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { id: 'narrative', label: 'Narrative', icon: BookOpen },
  { id: 'timeline', label: 'Timeline', icon: GitCommit },
  { id: 'deep-analysis', label: 'Deep Analysis', icon: ScanSearch },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'world', label: 'World Settings', icon: Globe },
  { id: 'notes', label: 'Note', icon: StickyNote },
  { id: 'analysis', label: 'Analysis', icon: BarChart2 },
  { id: 'config', label: 'Project & AI', icon: Settings },
];

export const Sidebar: React.FC = React.memo(() => {
  const currentProject = useStore(s => s.currentProject);
  const activeTab = useStore(s => s.activeTab);
  const setActiveTab = useStore(s => s.setActiveTab);
  const setCurrentProject = useStore(s => s.setCurrentProject);
  const logout = useStore(s => s.logout);
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return (
    <div className="w-20 xl:w-64 h-full glass rounded-[40px] flex flex-col p-4 xl:p-5 z-30 shadow-2xl relative overflow-y-auto scrollbar-hide transition-all duration-500">
      {/* Sidebar background decorative glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-[var(--accent)]/5 blur-[60px] pointer-events-none" />

      <div className="relative flex flex-col items-center mb-6 xl:mb-8 pt-2">
        <div className="w-12 xl:w-48 aspect-square flex items-center justify-center logo-glow overflow-hidden group relative">
          <img 
            src="/logo.png" 
            alt="Muse Logo" 
            className="w-full h-full object-contain logo-blend transition-all duration-1000 group-hover:scale-110 group-hover:rotate-3" 
          />
        </div>
      </div>

      <div className="mb-6 xl:mb-8">
        <button 
          onClick={() => setCurrentProject(null)}
          className="w-full text-left group"
        >
          <div className="glass-emerald rounded-[32px] p-5 border border-[var(--border-subtle)] group-hover:border-[var(--accent)]/40 transition-all hover:translate-x-1 shadow-lg">
            <div className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)] uppercase font-black mb-1.5 tracking-[0.3em]">
              <Library className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden xl:inline">Project Nexus</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black truncate text-[var(--text-bright)] uppercase tracking-tighter hidden xl:inline">{currentProject?.title || 'Open Library'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all group-hover:translate-x-1" />
            </div>
          </div>
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        <div className="px-5 mb-4 hidden xl:block">
            <span className="text-[10px] font-black text-[var(--accent)]/30 uppercase tracking-[0.4em]">Architecture</span>
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-5 py-3 rounded-[24px] transition-all duration-500 group relative overflow-hidden",
              activeTab === item.id 
                ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-[0_15px_30px_-5px_rgba(var(--accent),0.3)] scale-105" 
                : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-bright)]"
            )}

          >

            {activeTab === item.id && (
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            )}
            <item.icon className={cn("w-4 h-4 transition-all duration-500 z-10 flex-shrink-0", activeTab === item.id ? "text-[var(--bg-deep)] scale-110" : "group-hover:text-[var(--accent)]")} />
            <span className="text-[11px] font-black uppercase tracking-widest z-10 hidden xl:inline truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-white/5 space-y-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full h-12 flex items-center justify-center gap-3 bg-white/5 hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)] rounded-2xl transition-all duration-500 text-[10px] font-black uppercase tracking-widest group border border-[var(--border-subtle)] hover:border-[var(--accent)]/30"
          title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 transition-transform group-hover:rotate-12" />
              <span className="hidden xl:inline">Parchment Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
              <span className="hidden xl:inline">Inkwell Mode</span>
            </>
          )}
        </button>

        <button 
          onClick={handleLogout}
          className="w-full h-12 flex items-center justify-center gap-3 bg-red-500/5 hover:bg-red-500/10 text-red-400/50 hover:text-red-400 rounded-2xl transition-all duration-500 text-[10px] font-black uppercase tracking-widest group border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1 flex-shrink-0" />
          <span className="hidden xl:inline">Exit System</span>
        </button>
      </div>
    </div>
  );
});

