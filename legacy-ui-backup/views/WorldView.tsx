import React from 'react';
import { Plus, Map, Info, Home, Landmark, Package, Sword, Sparkles, Compass } from 'lucide-react';
import { useWorld } from '../hooks/useWorld';
import { cn } from '../lib/utils';
import { CreationModal } from '../components/CreationModal';
import { useToast } from '../components/Toast';

export const WorldView: React.FC = () => {
  const { settings, addSetting, updateSetting } = useWorld();
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = React.useState<'location' | 'object'>('location');
  const [selectedSettingId, setSelectedSettingId] = React.useState<string | null>(null);
  
  const filteredSettings = React.useMemo(() => 
    settings.filter(s => (s.category || 'location') === activeCategory),
  [settings, activeCategory]);

  const selectedSetting = React.useMemo(() => 
    settings.find(s => s.id === selectedSettingId) || null,
  [settings, selectedSettingId]);

  const [localName, setLocalName] = React.useState('');
  const [localDescription, setLocalDescription] = React.useState('');

  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Reset selection when switching categories
  React.useEffect(() => {
    setSelectedSettingId(null);
  }, [activeCategory]);

  // Sync local state when selection changes
  React.useEffect(() => {
    if (selectedSetting) {
      setLocalName(selectedSetting.name || '');
      setLocalDescription(selectedSetting.description || '');
    }
  }, [selectedSetting?.id]);

  // Debounce updates for name
  React.useEffect(() => {
    if (!selectedSetting) return;
    const timer = setTimeout(() => {
      if (localName !== selectedSetting.name && localName.trim() !== '') {
        updateSetting(selectedSetting.id, { name: localName });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [localName, selectedSetting?.id]);

  // Debounce updates for description
  React.useEffect(() => {
    if (!selectedSetting) return;
    const timer = setTimeout(() => {
      if (localDescription !== selectedSetting.description) {
        updateSetting(selectedSetting.id, { description: localDescription });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [localDescription, selectedSetting?.id]);

  const handleConfirmAdd = (name: string) => {
    addSetting(name, 'Primary', activeCategory);
    addToast(`${activeCategory === 'location' ? 'Luogo' : 'Oggetto'} "${name}" aggiunto al mondo`, 'success');
  };

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* Settings List */}
      <div className="w-80 flex flex-col gap-4">
        {/* Category Tabs */}
        <div className="flex p-1 bg-slate-900/50 border border-slate-700/50 rounded-2xl">
          <button
            onClick={() => setActiveCategory('location')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all rounded-xl",
              activeCategory === 'location' 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <Compass className="w-3 h-3" />
            Luoghi
          </button>
          <button
            onClick={() => setActiveCategory('object')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all rounded-xl",
              activeCategory === 'object' 
                ? "bg-amber-600 text-white shadow-lg shadow-amber-900/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <Package className="w-3 h-3" />
            Oggetti
          </button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            {activeCategory === 'location' ? (
              <Map className="w-5 h-5 text-emerald-400" />
            ) : (
              <Sword className="w-5 h-5 text-amber-400" />
            )}
            {activeCategory === 'location' ? 'Locations' : 'Objects'}
          </h2>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeCategory === 'location' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-amber-600 hover:bg-amber-500"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
          {filteredSettings.map(s => (
            <div 
              key={s.id}
              onClick={() => setSelectedSettingId(s.id)}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                selectedSettingId === s.id 
                  ? activeCategory === 'location'
                    ? "glass border-emerald-500 bg-emerald-600/10" 
                    : "glass border-amber-500 bg-amber-600/10"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-100">{s.name}</h3>
                {activeCategory === 'location' ? (
                  s.type === 'Primary' ? <Landmark className="w-3 h-3 text-emerald-400" /> : <Home className="w-3 h-3 text-slate-500" />
                ) : (
                  s.type === 'Primary' ? <Sparkles className="w-3 h-3 text-amber-400" /> : <Package className="w-3 h-3 text-slate-500" />
                )}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{s.description || 'No description yet...'}</p>
            </div>
          ))}
          {filteredSettings.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-700 opacity-20">
              {activeCategory === 'location' ? <Map className="w-12 h-12 mb-2" /> : <Package className="w-12 h-12 mb-2" />}
              <p className="text-xs font-serif italic text-center">Nessun {activeCategory === 'location' ? 'luogo' : 'oggetto'} creato</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 min-w-0 glass rounded-2xl border border-slate-700 flex flex-col overflow-hidden">
        {selectedSetting ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/20">
              <div className="flex-1 mr-4">
                <input 
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full bg-transparent text-2xl font-bold font-serif text-white focus:outline-none placeholder:opacity-20"
                  placeholder={activeCategory === 'location' ? "Nome del luogo..." : "Nome dell'oggetto..."}
                />
                <span className={cn(
                  "text-[10px] uppercase tracking-widest font-bold",
                  activeCategory === 'location' ? "text-emerald-500/50" : "text-amber-500/50"
                  )}>
                  {activeCategory === 'location' ? 'Location Identity' : 'Object Identity'}
                </span>
              </div>
              <select 
                value={selectedSetting.type}
                onChange={(e) => updateSetting(selectedSetting.id, { type: e.target.value as 'Primary' | 'Secondary' })}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-all font-bold"
              >
                <option value="Primary">{activeCategory === 'location' ? 'Primary Location' : 'Legendary/Rare'}</option>
                <option value="Secondary">{activeCategory === 'location' ? 'Secondary Location' : 'Commonly Used'}</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              <section className="space-y-4">
                <div className={cn(
                  "flex items-center gap-2",
                  activeCategory === 'location' ? "text-emerald-400" : "text-amber-400"
                )}>
                  <Info className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">
                    {activeCategory === 'location' ? 'Description & Sensory Details' : 'Description & Properties'}
                  </h4>
                </div>
                <textarea 
                  className={cn(
                    "w-full h-80 bg-slate-900/50 border border-slate-700 rounded-2xl p-6 text-sm text-slate-200 focus:outline-none leading-relaxed transition-all placeholder:opacity-20",
                    activeCategory === 'location' ? "focus:border-emerald-500 focus:bg-slate-900/80" : "focus:border-amber-500 focus:bg-slate-900/80"
                  )}
                  placeholder={activeCategory === 'location' 
                    ? "What does it smell like? What are the key features? Is it crowded or silent?" 
                    : "What is the history of this object? Does it have magical properties? Who owns it?"
                  }
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                />
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
            {activeCategory === 'location' ? <Map className="w-16 h-16 opacity-10" /> : <Package className="w-16 h-16 opacity-10" />}
            <p className="text-sm italic opacity-50 font-serif">Seleziona un {activeCategory === 'location' ? 'luogo' : 'oggetto'} per visualizzare i dettagli</p>
          </div>
        )}
      </div>
      
      <CreationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAdd}
        title={activeCategory === 'location' ? "Nuovo Luogo" : "Nuovo Oggetto"}
        placeholder={activeCategory === 'location' ? "Inserisci il nome della location..." : "Inserisci il nome dell'oggetto..."}
      />
    </div>
  );
};
