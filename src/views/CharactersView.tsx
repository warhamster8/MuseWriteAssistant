import React, { useRef } from 'react';
import { Plus, User, Users, FileText, Brain, TrendingUp, MessageSquare, Camera, Trash2, Crown, Sword, Star } from 'lucide-react';
import { useCharacters } from '../hooks/useCharacters';
import { cn } from '../lib/utils';
import { groqService } from '../lib/groq';
import { CreationModal } from '../components/CreationModal';
import { useToast } from '../components/Toast';

export const CharactersView: React.FC = () => {
  const { characters, addCharacter, updateCharacter, deleteCharacter, addInterview } = useCharacters();
  const { addToast } = useToast();
  const [selectedCharId, setSelectedCharId] = React.useState<string | null>(null);
  const selectedChar = React.useMemo(() => 
    characters.find(c => c.id === selectedCharId) || null,
  [characters, selectedCharId]);

  const [localName, setLocalName] = React.useState('');
  const [localBio, setLocalBio] = React.useState('');
  const [localPsychology, setLocalPsychology] = React.useState('');
  const [localEvolution, setLocalEvolution] = React.useState('');
  const [posX, setPosX] = React.useState(50);
  const [posY, setPosY] = React.useState(50);
  const [isAdjusting, setIsAdjusting] = React.useState(false);

  const [isInterviewing, setIsInterviewing] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when selection changes
  React.useEffect(() => {
    if (selectedChar) {
      setLocalName(selectedChar.name || '');
      setLocalBio(selectedChar.bio || '');
      setLocalPsychology(selectedChar.psychology || '');
      setLocalEvolution(selectedChar.evolution || '');
      setPosX(selectedChar.avatar_pos_x ?? 50);
      setPosY(selectedChar.avatar_pos_y ?? 50);
      setIsAdjusting(false);
    }
  }, [selectedChar?.id]);

  // Debounce updates for name
  React.useEffect(() => {
    if (!selectedChar) return;
    const timer = setTimeout(() => {
      if (localName !== selectedChar.name && localName.trim() !== '') {
        updateCharacter(selectedChar.id, { name: localName });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [localName, selectedChar?.id]);

  // Debounce updates for position
  React.useEffect(() => {
    if (!selectedChar || isAdjusting === false) return;
    const timer = setTimeout(() => {
      if (posX !== selectedChar.avatar_pos_x || posY !== selectedChar.avatar_pos_y) {
        updateCharacter(selectedChar.id, { avatar_pos_x: posX, avatar_pos_y: posY });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [posX, posY, selectedChar?.id]);

  // Debounce updates to the store/DB
  React.useEffect(() => {
    if (!selectedChar) return;
    const timer = setTimeout(() => {
      if (localBio !== selectedChar.bio) updateCharacter(selectedChar.id, { bio: localBio });
    }, 800);
    return () => clearTimeout(timer);
  }, [localBio, selectedChar?.id]);

  React.useEffect(() => {
    if (!selectedChar) return;
    const timer = setTimeout(() => {
      if (localPsychology !== selectedChar.psychology) updateCharacter(selectedChar.id, { psychology: localPsychology });
    }, 800);
    return () => clearTimeout(timer);
  }, [localPsychology, selectedChar?.id]);

  React.useEffect(() => {
    if (!selectedChar) return;
    const timer = setTimeout(() => {
      if (localEvolution !== selectedChar.evolution) updateCharacter(selectedChar.id, { evolution: localEvolution });
    }, 800);
    return () => clearTimeout(timer);
  }, [localEvolution, selectedChar?.id]);

  const handleConfirmAdd = (name: string) => {
    addCharacter(name);
    addToast(`Personaggio "${name}" creato!`, 'success');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChar) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast('L\'immagine è troppo grande (max 2MB)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateCharacter(selectedChar.id, { avatar_url: base64String, avatar_pos_x: 50, avatar_pos_y: 50 });
      setPosX(50);
      setPosY(50);
      addToast('Immagine caricata con successo', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleInterview = async () => {
    if (!selectedChar) return;
    setIsInterviewing(true);
    try {
      const messages = [
        { 
          role: 'system', 
          content: `You are the character ${selectedChar.name}. 
          BIO: ${selectedChar.bio}. 
          PSYCHOLOGY: ${selectedChar.psychology}. 
          An interviewer is talking to you. Reply as the character with their voice and personality.` 
        },
        { role: 'user', content: 'Tell me something about your deepest secret or motivation.' }
      ];
      const res = await groqService.getChatCompletion(messages);
      const answer = res.choices[0]?.message?.content || '';
      await addInterview(selectedChar.id, 'Parlami di te...', answer);
      addToast(`Intervista completata con ${selectedChar.name}`, 'info');
      alert(`${selectedChar.name} dice: ${answer}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInterviewing(false);
    }
  };

  return (
    <div className="flex h-full gap-8 p-4 overflow-hidden animate-in fade-in duration-1000 bg-[var(--bg-deep)]">
      {/* Character List */}
      <div className="w-80 flex flex-col gap-6">
        <div className="flex items-center justify-between glass p-6 rounded-[32px] border border-[var(--border-subtle)] shadow-2xl">
          <h2 className="text-[11px] font-black font-display flex items-center gap-4 tracking-[0.4em] text-[var(--text-muted)] uppercase">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            Cast Matrix
          </h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] p-2.5 rounded-xl transition-all shadow-lg active:scale-90 group">
            <Plus className="w-4 h-4 text-[var(--bg-deep)] group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
          {characters.map(char => (
            <div 
              key={char.id}
              onClick={() => setSelectedCharId(char.id)}
              className={cn(
                "p-5 rounded-[32px] border transition-all duration-500 cursor-pointer flex gap-5 items-center group relative overflow-hidden",
                selectedCharId === char.id 
                  ? "glass-emerald border-[var(--accent)]/30 shadow-xl" 
                  : "glass border-[var(--border-subtle)] hover:border-[var(--accent)]/20",
                char.role === 'protagonist' && "border-l-4 border-l-[var(--accent)]",
                char.role === 'co-protagonist' && "border-l-4 border-l-cyan-400",
                char.role === 'antagonist' && "border-l-4 border-l-red-400"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-[20px] overflow-hidden bg-[var(--bg-deep)]/40 border flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-700",
                char.role === 'protagonist' ? "border-[var(--accent)]/40 shadow-[0_0_15px_rgba(91,233,177,0.2)]" :
                char.role === 'co-protagonist' ? "border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]" :
                char.role === 'antagonist' ? "border-red-400/40 shadow-[0_0_15px_rgba(248,113,113,0.2)]" : "border-[var(--border-subtle)]"
              )}>
                {char.avatar_url ? (
                  <img 
                    src={char.avatar_url} 
                    alt={char.name} 
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: `${char.avatar_pos_x ?? 50}% ${char.avatar_pos_y ?? 50}%` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <User className="w-8 h-8 opacity-20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={cn("font-black text-sm uppercase tracking-tighter truncate transition-colors duration-500", selectedCharId === char.id ? "text-[var(--text-bright)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-bright)]")}>
                    {char.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", char.bio ? "bg-[var(--accent)]/40" : "bg-[var(--text-muted)]")} />
                  <p className={cn(
                    "text-[9px] uppercase tracking-widest font-black opacity-60 truncate",
                    char.role === 'protagonist' ? "text-[var(--accent)]" :
                    char.role === 'co-protagonist' ? "text-cyan-400" :
                    char.role === 'antagonist' ? "text-red-400" : "text-[var(--text-muted)]"
                  )}>
                      {char.role === 'protagonist' ? 'Protagonista' : char.role === 'co-protagonist' ? 'Co-Protagonista' : char.role === 'antagonist' ? 'Antagonista' : char.role === 'secondary' ? 'Secondario' : 'Indefinito'}
                  </p>
                </div>
              </div>
              {char.role === 'protagonist' && <Crown className="w-4 h-4 text-[var(--accent)] absolute top-4 right-4 animate-pulse" />}
              {char.role === 'co-protagonist' && <Star className="w-4 h-4 text-cyan-400 absolute top-4 right-4" />}
              {char.role === 'antagonist' && <Sword className="w-4 h-4 text-red-400 absolute top-4 right-4" />}
            </div>
          ))}
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 min-w-0 glass rounded-3xl border border-[var(--border-subtle)] flex flex-col overflow-hidden shadow-2xl relative">
        {selectedChar ? (
          <div className="flex flex-col h-full bg-[var(--bg-surface)]/20">
            <div className="p-16 border-b border-[var(--border-subtle)] relative overflow-hidden group/header">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--accent)]/5 blur-[180px] -mr-48 -mt-48 transition-all group-hover/header:bg-[var(--accent)]/10 pointer-events-none" />
              
              <div className="relative flex flex-col md:flex-row items-center md:items-end gap-12">
                {/* Large Portrait */}
                <div className="relative">
                  <div 
                    onClick={() => !isAdjusting && fileInputRef.current?.click()}
                    className={cn(
                      "group relative w-64 h-80 rounded-[48px] bg-[var(--bg-deep)] border border-[var(--border-subtle)] overflow-hidden transition-all duration-700 shadow-2xl flex-shrink-0",
                      isAdjusting ? "ring-2 ring-[var(--accent)] cursor-move scale-95" : "cursor-pointer hover:border-[var(--accent)]/40 hover:-translate-y-2"
                    )}
                  >
                    {selectedChar.avatar_url ? (
                      <img 
                        src={selectedChar.avatar_url} 
                        alt={selectedChar.name} 
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-1000",
                          !isAdjusting && "group-hover:scale-110"
                        )}
                        style={{ objectPosition: `${posX}% ${posY}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-card)]/50">
                        <Camera className="w-16 h-16 mb-4 opacity-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-5">Assign Visual</span>
                      </div>
                    )}
                    {!isAdjusting && (
                      <div className="absolute inset-0 bg-[var(--accent-soft)]/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-md">
                        <Camera className="w-12 h-12 text-[var(--text-bright)]" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload} 
                    />
                  </div>

                  {/* Positioning Controls overlay */}
                  {selectedChar.avatar_url && (
                    <button
                      onClick={() => setIsAdjusting(!isAdjusting)}
                      className={cn(
                        "absolute -bottom-4 -right-4 p-5 rounded-[24px] shadow-2xl transition-all z-10 border border-[var(--border-subtle)] group/btn",
                        isAdjusting ? "bg-[var(--accent)] text-[var(--bg-deep)]" : "glass text-[var(--text-secondary)] hover:text-[var(--accent)] hover:scale-110"
                      )}
                    >
                      <TrendingUp className={cn("w-5 h-5 transition-transform duration-700", isAdjusting && "rotate-180")} />
                    </button>
                  )}
                </div>

                {/* Name & Actions */}
                <div className="flex-1 flex flex-col items-center md:items-start pb-4 min-w-0">
                  {isAdjusting ? (
                    <div className="w-full max-w-sm space-y-6 mb-10 p-8 glass-emerald rounded-3xl border border-[var(--accent)]/30 backdrop-blur-3xl animate-in slide-in-from-bottom-8 duration-700">
                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.4em]">
                          <span>Horizon</span>
                          <span className="font-mono text-xs">{posX}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posX}
                          onChange={(e) => setPosX(parseInt(e.target.value))}
                          className="w-full h-1 bg-[var(--bg-deep)]/40 rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.4em]">
                          <span>Vertical</span>
                          <span className="font-mono text-xs">{posY}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posY}
                          onChange={(e) => setPosY(parseInt(e.target.value))}
                          className="w-full h-1 bg-[var(--bg-deep)]/40 rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                          await updateCharacter(selectedChar.id, { avatar_pos_x: posX, avatar_pos_y: posY });
                          setIsAdjusting(false);
                          addToast("Inquadratura salvata!", "success");
                        }}
                        className="w-full py-5 bg-[var(--accent)] hover:bg-opacity-90 text-[var(--bg-deep)] text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-2xl active:scale-95"
                      >
                        Commit Framework
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-5 mb-6">
                        <div className="flex bg-[var(--bg-deep)]/40 p-1.5 rounded-[22px] border border-[var(--border-subtle)] shadow-inner">
                          {[
                            { id: 'protagonist', label: 'Protagonista', icon: Crown, color: 'text-[var(--accent)]', activeBg: 'bg-[var(--accent)]' },
                            { id: 'co-protagonist', label: 'Co-Protagonista', icon: Star, color: 'text-cyan-400', activeBg: 'bg-cyan-500' },
                            { id: 'antagonist', label: 'Antagonista', icon: Sword, color: 'text-red-400', activeBg: 'bg-red-500' },
                            { id: 'secondary', label: 'Secondario', icon: Users, color: 'text-[var(--text-secondary)]', activeBg: 'bg-[var(--bg-surface)]' }
                          ].map(role => (
                            <button
                              key={role.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await updateCharacter(selectedChar.id, { role: role.id as any });
                                addToast(`Ruolo aggiornato: ${role.label}`, 'success');
                              }}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-[16px] text-[9px] font-black uppercase tracking-widest transition-all relative z-10",
                                (selectedChar.role || 'secondary') === role.id 
                                  ? `${role.activeBg} text-[var(--bg-deep)] shadow-lg` 
                                  : "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-white/5"
                              )}
                            >
                              <role.icon className={cn("w-3.5 h-3.5", (selectedChar.role || 'secondary') === role.id ? "text-[var(--bg-deep)]" : role.color)} />
                              <span className="hidden lg:inline">{role.label}</span>
                            </button>
                          ))}
                        </div>
                        {selectedChar.avatar_url && (
                          <button 
                            onClick={() => updateCharacter(selectedChar.id, { avatar_url: '' })}
                            className="text-[var(--text-muted)] hover:text-red-400 p-2.5 transition-all bg-[var(--bg-surface)]/10 rounded-xl border border-transparent hover:border-red-500/20"
                            title="Rimuovi foto"
                          >
                            <Trash2 className="w-5 h-5 opacity-40 hover:opacity-100" />
                          </button>
                        )}
                        <button 
                            onClick={() => {
                              deleteCharacter(selectedChar.id);
                              setSelectedCharId(null);
                            }}
                            className="text-[var(--text-muted)] hover:text-red-400 p-2.5 transition-all bg-[var(--bg-surface)]/10 rounded-xl border border-transparent hover:border-red-500/20"
                            title="Elimina Personaggio"
                          >
                            <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <input 
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="text-7xl font-black font-display bg-transparent text-[var(--text-bright)] focus:outline-none placeholder:opacity-5 tracking-tighter mb-10 truncate w-full uppercase"
                        placeholder="Unnamed Character"
                      />
                    </>
                  )}
                  
                  {!isAdjusting && (
                    <div className="flex flex-wrap gap-5">
                      <button 
                        onClick={handleInterview}
                        disabled={isInterviewing}
                        className="flex items-center gap-5 px-12 py-5 bg-[var(--accent)] hover:bg-opacity-90 text-[var(--bg-deep)] rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-2xl shadow-[var(--accent-soft)] active:scale-95 group"
                      >
                        <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        {isInterviewing ? 'Probing...' : 'Initiate Interview'}
                      </button>
                      
                      <button 
                        onClick={() => addToast('Analisi tratti in arrivo...', 'info')}
                        className="flex items-center gap-5 px-12 py-5 glass hover:bg-[var(--bg-surface)]/10 text-[var(--text-secondary)] rounded-[28px] text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-[var(--border-subtle)] group"
                      >
                        <TrendingUp className="w-5 h-5 group-hover:scale-125 transition-transform" />
                        Analytics
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-16 space-y-16 scrollbar-hide">
              <section className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000 delay-100">
                <div className="flex items-center gap-4 text-[var(--accent)]/40">
                  <FileText className="w-5 h-5" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.4em]">Historical Context & Roots</h4>
                </div>
                <textarea 
                  className="w-full h-48 glass border border-[var(--border-subtle)] rounded-3xl p-10 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/20 focus:bg-[var(--bg-surface)]/30 transition-all placeholder:text-[var(--text-muted)] leading-relaxed scrollbar-hide shadow-inner"
                  placeholder="Elaborate on origins, past traumas and core secrets..."
                  value={localBio}
                  onChange={(e) => setLocalBio(e.target.value)}
                />
              </section>

              <section className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000 delay-200">
                <div className="flex items-center gap-4 text-[var(--accent)]/50">
                  <Brain className="w-5 h-5" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.4em]">Psychological Core & Conflict</h4>
                </div>
                <textarea 
                  className="w-full h-48 glass border border-[var(--border-subtle)] rounded-3xl p-10 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/20 focus:bg-[var(--bg-surface)]/30 transition-all placeholder:text-[var(--text-muted)] leading-relaxed scrollbar-hide shadow-inner"
                  placeholder="What is the character's engine? Their deepest fears and fatal flaws?"
                  value={localPsychology}
                  onChange={(e) => setLocalPsychology(e.target.value)}
                />
              </section>

              <section className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000 delay-300">
                <div className="flex items-center gap-4 text-[var(--accent)]/60">
                  <TrendingUp className="w-5 h-5" />
                  <h4 className="text-[11px] font-black uppercase tracking-[0.4em]">Evolutionary Arc</h4>
                </div>
                <textarea 
                  className="w-full h-48 glass border border-[var(--border-subtle)] rounded-3xl p-10 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/20 focus:bg-[var(--bg-surface)]/30 transition-all placeholder:text-[var(--text-muted)] leading-relaxed scrollbar-hide shadow-inner"
                  placeholder="How does the character transform from the first draft to the finale?"
                  value={localEvolution}
                  onChange={(e) => setLocalEvolution(e.target.value)}
                />
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] space-y-10 animate-in fade-in duration-1000">
            <div className="relative group">
              <div className="absolute inset-0 bg-[var(--accent)]/10 blur-[60px] rounded-full animate-pulse group-hover:bg-[var(--accent)]/20 transition-all duration-1000" />
              <div className="w-40 h-40 rounded-[48px] glass border border-[var(--border-subtle)] flex items-center justify-center opacity-20 group-hover:opacity-40 transition-all duration-700 shadow-2xl">
                <Users className="w-16 h-16" />
              </div>
            </div>
            <div className="text-center relative z-10">
                <h3 className="text-xl font-black text-[var(--text-secondary)] uppercase tracking-[0.4em]">Cast Nexus</h3>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[280px] mx-auto mt-4 tracking-[0.2em] font-black uppercase opacity-40 leading-relaxed">Select a character to initialize technical and psychological analysis.</p>
            </div>
          </div>
        )}
      </div>
      
      <CreationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAdd}
        title="Creazione Attore"
        placeholder="Nome del personaggio..."
      />
    </div>
  );
};
