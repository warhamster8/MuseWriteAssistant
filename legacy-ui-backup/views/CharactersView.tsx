import React, { useRef } from 'react';
import { Plus, User, FileText, Brain, TrendingUp, MessageSquare, Camera, Trash2 } from 'lucide-react';
import { useCharacters } from '../hooks/useCharacters';
import { cn } from '../lib/utils';
import { groqService } from '../lib/groq';
import { CreationModal } from '../components/CreationModal';
import { useToast } from '../components/Toast';

export const CharactersView: React.FC = () => {
  const { characters, addCharacter, updateCharacter, addInterview } = useCharacters();
  const { addToast } = useToast();
  const [selectedCharId, setSelectedCharId] = React.useState<string | null>(null);
  const selectedChar = React.useMemo(() => 
    characters.find(c => c.id === selectedCharId) || null,
  [characters, selectedCharId]);

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
      setLocalBio(selectedChar.bio || '');
      setLocalPsychology(selectedChar.psychology || '');
      setLocalEvolution(selectedChar.evolution || '');
      setPosX(selectedChar.avatar_pos_x ?? 50);
      setPosY(selectedChar.avatar_pos_y ?? 50);
      setIsAdjusting(false);
    }
  }, [selectedChar?.id]);

  // Debounce updates for position
  React.useEffect(() => {
    if (!selectedChar) return;
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
    <div className="flex h-full gap-6 overflow-hidden">
      {/* Character List */}
      <div className="w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Characters
          </h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 p-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
          {characters.map(char => (
            <div 
              key={char.id}
              onClick={() => setSelectedCharId(char.id)}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer flex gap-3 items-center",
                selectedCharId === char.id 
                  ? "glass border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-900/10" 
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
              )}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0">
                {char.avatar_url ? (
                  <img 
                    src={char.avatar_url} 
                    alt={char.name} 
                    className="w-full h-full object-cover" 
                    style={{ objectPosition: `${char.avatar_pos_x ?? 50}% ${char.avatar_pos_y ?? 50}%` }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <User className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-100 truncate">{char.name}</h3>
                <p className="text-[10px] text-slate-500 truncate">{char.bio || 'No bio...'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 min-w-0 glass rounded-2xl border border-slate-700 flex flex-col overflow-hidden">
        {selectedChar ? (
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-slate-700 bg-slate-800/20 relative overflow-hidden group/header">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[120px] -mr-48 -mt-48 transition-all group-hover/header:bg-blue-600/10" />
              
              <div className="relative flex flex-col md:flex-row items-center md:items-end gap-8">
                {/* Large Portrait */}
                <div className="relative">
                  <div 
                    onClick={() => !isAdjusting && fileInputRef.current?.click()}
                    className={cn(
                      "group relative w-48 h-64 rounded-3xl bg-slate-950 border-2 overflow-hidden transition-all shadow-2xl flex-shrink-0",
                      isAdjusting ? "border-blue-500 cursor-move" : "border-slate-700/50 cursor-pointer hover:border-blue-500"
                    )}
                  >
                    {selectedChar.avatar_url ? (
                      <img 
                        src={selectedChar.avatar_url} 
                        alt={selectedChar.name} 
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-500",
                          !isAdjusting && "group-hover:scale-105"
                        )}
                        style={{ objectPosition: `${posX}% ${posY}%` }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-900/50">
                        <Camera className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-20">Click to Upload</span>
                      </div>
                    )}
                    {!isAdjusting && (
                      <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-8 h-8 text-white" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Change Portrait</span>
                        </div>
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
                        "absolute -bottom-3 -right-3 p-3 rounded-2xl shadow-xl transition-all z-10",
                        isAdjusting ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500"
                      )}
                    >
                      <TrendingUp className={cn("w-4 h-4 transition-transform", isAdjusting && "rotate-90")} />
                    </button>
                  )}
                </div>

                {/* Name & Actions */}
                <div className="flex-1 flex flex-col items-center md:items-start pb-2">
                  {isAdjusting ? (
                    <div className="w-full max-w-xs space-y-4 mb-6 p-4 glass rounded-2xl border border-blue-500/30">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                          <span>Orizzontale</span>
                          <span>{posX}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posX}
                          onChange={(e) => setPosX(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                          <span>Verticale</span>
                          <span>{posY}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={posY}
                          onChange={(e) => setPosY(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                      <button 
                        onClick={() => setIsAdjusting(false)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-lg transition-all"
                      >
                        Conferma Posizione
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-500/20">
                          Protagonist Identity
                        </span>
                        {selectedChar.avatar_url && (
                          <button 
                            onClick={() => updateCharacter(selectedChar.id, { avatar_url: '' })}
                            className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                            title="Remove photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h2 className="text-5xl font-bold font-serif text-white tracking-tight mb-6">
                        {selectedChar.name}
                      </h2>
                    </>
                  )}
                  
                  {!isAdjusting && (
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleInterview}
                        disabled={isInterviewing}
                        className="flex items-center gap-3 px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-900/30 active:scale-95"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {isInterviewing ? 'Consulting Muse...' : 'Interview Character'}
                      </button>
                      
                      <button 
                        onClick={() => addToast('Analisi tratti in arrivo...', 'info')}
                        className="flex items-center gap-3 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-sm font-bold transition-all active:scale-95 border border-slate-700"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Analyze Stats
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <FileText className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Biography</h4>
                </div>
                <textarea 
                  className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:bg-slate-900/80 transition-all placeholder:opacity-20"
                  placeholder="Describe the character's origin story, personality, and background..."
                  value={localBio}
                  onChange={(e) => setLocalBio(e.target.value)}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <Brain className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Psychology</h4>
                </div>
                <textarea 
                  className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 focus:bg-slate-900/80 transition-all placeholder:opacity-20"
                  placeholder="What drives them? What are their fears and core beliefs?"
                  value={localPsychology}
                  onChange={(e) => setLocalPsychology(e.target.value)}
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-orange-400">
                  <TrendingUp className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-widest">Arc & Evolution</h4>
                </div>
                <textarea 
                  className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-2xl p-5 text-sm text-slate-200 focus:outline-none focus:border-orange-500 focus:bg-slate-900/80 transition-all placeholder:opacity-20"
                  placeholder="How does their journey change them from the beginning to the end?"
                  value={localEvolution}
                  onChange={(e) => setLocalEvolution(e.target.value)}
                />
              </section>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-6">
            <div className="w-24 h-24 rounded-full border-2 border-slate-800 flex items-center justify-center opacity-20">
              <User className="w-12 h-12" />
            </div>
            <p className="text-sm italic opacity-50 tracking-wide font-serif">Select a character to reveal their details</p>
          </div>
        )}
      </div>
      
      <CreationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAdd}
        title="Nuovo Personaggio"
        placeholder="Esempio: Arthur Pendragon..."
      />
    </div>
  );
};
