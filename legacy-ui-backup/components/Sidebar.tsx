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
  Library
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
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'world', label: 'World Settings', icon: Globe },
  { id: 'notes', label: 'Note', icon: StickyNote },
  { id: 'analysis', label: 'Analysis', icon: BarChart2 },
  { id: 'config', label: 'AI Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentProject, activeTab, setActiveTab, setCurrentProject, logout } = useStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  return (
    <div className="w-64 h-screen glass border-r border-slate-700 flex flex-col">
      <div className="p-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full glass flex items-center justify-center p-1 mb-2 border-white/10 shadow-lg logo-glow">
          <img src="/logo.png" alt="Muse Logo" className="w-full h-full object-contain logo-blend scale-125" />
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Novel Architect</p>
      </div>

      <div className="px-4 mb-4">
        <button 
          onClick={() => setCurrentProject(null)}
          className="w-full text-left group"
        >
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 group-hover:border-blue-500/50 transition-all hover:bg-slate-800">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-tighter">
              <Library className="w-3 h-3" />
              <span>Current Project</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold truncate text-slate-200">{currentProject?.title || 'Seleziona...'}</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeTab === item.id 
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-700/50 space-y-1">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-red-950/30 hover:text-red-400 rounded-lg text-slate-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Esci</span>
        </button>
      </div>
    </div>
  );
};

