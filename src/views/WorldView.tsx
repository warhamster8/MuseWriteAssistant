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
    <div className="flex h-full gap-6 overflow-hidden animate-in fade-in duration-700">
      {/* Settings List */}
      <div className="w-80 flex flex-col gap-6">
        {/* Category Tabs */}
        <div className="flex p-1.5 bg-[var(--bg-deep)] border border-[var(--border-subtle)] rounded-[22px] shadow-inner">
          <button
            onClick={() => setActiveCategory('location')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-[16px]",
              activeCategory === 'location' 
                ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-xl border border-[var(--border-subtle)]" 
                : "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-surface)]/10"
            )}
          >
            <Compass className="w-3.5 h-3.5" />
            Luoghi
          </button>
          <button
            onClick={() => setActiveCategory('object')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-[16px]",
              activeCategory === 'object' 
                ? "bg-[var(--accent)] text-[var(--bg-deep)] shadow-xl border border-[var(--border-subtle)]" 
                : "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-surface)]/10"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            Oggetti
          </button>
        </div>

        <div className="flex items-center justify-between bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
             {activeCategory === 'location' ? (
                <Map className="w-4 h-4 text-[var(--accent)]" />
             ) : (
                <Sword className="w-4 h-4 text-[var(--accent)]" />
             )}
             <h2 className="text-sm font-bold font-display tracking-[0.2em] text-[var(--text-muted)]">
               {activeCategory === 'location' ? 'LOCATIONS' : 'ARTIFACTS'}
             </h2>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] p-2 rounded-xl transition-all shadow-lg active:scale-90"
          >
            <Plus className="w-4 h-4 text-[var(--bg-deep)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
          {filteredSettings.map(s => (
            <div 
              key={s.id}
              onClick={() => setSelectedSettingId(s.id)}
              className={cn(
                "p-5 rounded-[28px] border transition-all cursor-pointer group relative overflow-hidden",
                selectedSettingId === s.id 
                  ? "bg-[var(--accent-soft)] border-[var(--accent)]/30 shadow-xl" 
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent)]/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={cn("font-bold tracking-tight transition-colors", selectedSettingId === s.id ? "text-[var(--accent)]" : "text-[var(--text-bright)]")}>
                    {s.name}
                </h3>
                {activeCategory === 'location' ? (
                  s.type === 'Primary' ? <Landmark className="w-3.5 h-3.5 text-[var(--accent)]/50" /> : <Home className="w-3.5 h-3.5 text-[var(--text-muted)]/30" />
                ) : (
                  s.type === 'Primary' ? <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]/50" /> : <Package className="w-3.5 h-3.5 text-[var(--text-muted)]/30" />
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed font-light">{s.description || 'Nessuna documentazione...'}</p>
            </div>
          ))}
          {filteredSettings.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
              <div className="w-20 h-20 rounded-[30px] border border-[var(--border-subtle)] flex items-center justify-center bg-[var(--bg-deep)]/20 opacity-20">
                 {activeCategory === 'location' ? <Map className="w-8 h-8" /> : <Package className="w-8 h-8" />}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 text-center">Settore vuoto</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 min-w-0 bg-[var(--bg-surface)] rounded-[40px] border border-[var(--border-subtle)] flex flex-col overflow-hidden shadow-sm">
        {selectedSetting ? (
          <div className="flex flex-col h-full">
            <div className="p-10 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/10 flex items-center justify-between group/detail">
              <div className="flex-1 mr-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent)] text-[9px] font-bold uppercase tracking-[0.2em] rounded-full border border-[var(--accent)]/10">
                      {activeCategory === 'location' ? 'Analisi Geografica' : 'Documentazione Oggetto'}
                    </span>
                </div>
                <input 
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full bg-transparent text-5xl font-medium font-display text-[var(--text-bright)] focus:outline-none placeholder:opacity-5 tracking-tighter"
                  placeholder={activeCategory === 'location' ? "Coordinate Luogo..." : "Nome Identificativo..."}
                />
              </div>
              <div className="flex flex-col items-end gap-3">
                  <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Importanza</div>
                  <select 
                    value={selectedSetting.type}
                    onChange={(e) => updateSetting(selectedSetting.id, { type: e.target.value as 'Primary' | 'Secondary' })}
                    className="bg-[var(--bg-deep)] border border-[var(--border-subtle)] text-[10px] text-[var(--accent)] rounded-xl px-5 py-3 outline-none focus:border-[var(--accent)]/50 transition-all font-bold uppercase tracking-widest cursor-pointer shadow-lg"
                  >
                    <option value="Primary">{activeCategory === 'location' ? 'Nucleo Primario' : 'Leggendario / Unico'}</option>
                    <option value="Secondary">{activeCategory === 'location' ? 'Settore Secondario' : 'Comune / Reperibile'}</option>
                  </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-hide">
              <section className="space-y-6">
                <div className="flex items-center gap-3 text-[var(--accent)]/50">
                  <Info className="w-4 h-4" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em]">
                    {activeCategory === 'location' ? 'Dettagli Sensoriali & Atmosfera' : 'Proprietà & Note Tecniche'}
                  </h4>
                </div>
                <textarea 
                  className="w-full h-96 bg-[var(--bg-deep)]/20 border border-[var(--border-subtle)] rounded-[40px] p-10 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 focus:bg-[var(--bg-surface)]/40 transition-all placeholder:text-[var(--text-muted)] leading-relaxed scrollbar-hide"
                  placeholder={activeCategory === 'location' 
                    ? "Quali profumi pervadono l'aria? Qual è la temperatura? Quali architetture dominano la vista?" 
                    : "Qual è la storia di questo oggetto? Possiede peculiarità uniche? A chi appartiene attualmente?"
                  }
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                />
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-8 animate-in fade-in duration-1000">
            <div className="w-32 h-32 rounded-[40px] border border-[var(--border-subtle)] flex items-center justify-center opacity-10 bg-[var(--bg-surface)]/10">
              {activeCategory === 'location' ? <Map className="w-14 h-14" /> : <Package className="w-14 h-14" />}
            </div>
            <div className="text-center">
                <h3 className="text-lg font-medium text-[var(--text-secondary)]">Mappatura Mondo</h3>
                <p className="text-xs opacity-50 max-w-[200px] mx-auto mt-2 tracking-wide font-light">Seleziona un'entità per accedere alla sua documentazione topografica o tecnica.</p>
            </div>
          </div>
        )}
      </div>
      
      <CreationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAdd}
        title={activeCategory === 'location' ? "Nuova Geometria" : "Nuovo Manufatto"}
        placeholder={activeCategory === 'location' ? "Esempio: Città d'Argento..." : "Esempio: Cronografo di Aethel..."}
      />
    </div>
  );
};
