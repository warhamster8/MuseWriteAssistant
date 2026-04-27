import React from 'react';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Folder, 
  GripVertical, 
  Library, 
  FileDown, 
  Eye, 
  EyeOff, 
  X, 
  Trash2, 
  Search, 
  Tag 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Skeleton } from '../../components/Skeleton';

import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { cn } from '../../lib/utils';
import type { Chapter, SceneStatus } from '../../types/narrative';

interface ManuscriptNavigatorProps {
  chapters: Chapter[];
  activeSceneId: string | null;
  expandedChapters: Set<string>;
  onToggleChapter: (id: string) => void;
  onSelectScene: (id: string) => void;
  onCreateChapter: () => void;
  onCreateScene: (chapterId: string) => void;
  onReorder: (result: DropResult) => void;
  onRenameChapter: (id: string, title: string) => void;
  onRenameScene: (id: string, title: string) => void;
  onDeleteChapter: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onToggleSceneExclusion: (id: string, exclude: boolean) => void;
  onUpdateSceneStatus: (id: string, status: SceneStatus) => void;
  onUpdateSceneTags: (id: string, tags: string[]) => void;
  onExport: () => void;
  isExporting: boolean;
  loading?: boolean;
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#6b7280', bg: 'bg-slate-500/10' },
  revised: { label: 'Revised', color: '#f59e0b', bg: 'bg-amber-500/10' },
  complete: { label: 'Complete', color: '#10b981', bg: 'bg-emerald-500/10' }
};

const STATUSES: SceneStatus[] = ['draft', 'revised', 'complete'];

export const ManuscriptNavigator: React.FC<ManuscriptNavigatorProps> = ({
  chapters,
  activeSceneId,
  expandedChapters,
  onToggleChapter,
  onSelectScene,
  onCreateChapter,
  onCreateScene,
  onReorder,
  onRenameChapter,
  onRenameScene,
  onDeleteChapter,
  onDeleteScene,
  onToggleSceneExclusion,
  onUpdateSceneStatus,
  onUpdateSceneTags,
  onExport,
  isExporting,
  loading
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [tagInputId, setTagInputId] = React.useState<string | null>(null);
  const [newTag, setNewTag] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const DEFAULT_TAGS = ['protagonist', 'dialogo', 'azione', 'descrizione', 'transizione'];
  const setNavigatorOpen = useStore(s => s.setNavigatorOpen);

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    const handleSearch = () => {
      searchInputRef.current?.focus();
    };
    window.addEventListener('muse-shortcut-search', handleSearch);
    return () => window.removeEventListener('muse-shortcut-search', handleSearch);
  }, []);

  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    chapters.forEach(c => c.scenes?.forEach(s => s.tags?.forEach(t => tags.add(t))));
    return Array.from(tags);
  }, [chapters]);

  const filteredChapters = React.useMemo(() => {
    let result = chapters;
    const term = debouncedSearchTerm.toLowerCase();

    return result.map(c => {
      const filteredScenes = c.scenes?.filter(s => {
        const matchesSearch = !term || s.title.toLowerCase().includes(term) || s.content?.toLowerCase().includes(term);
        const matchesTag = !selectedTag || s.tags?.includes(selectedTag);
        return matchesSearch && matchesTag;
      });

      return { ...c, scenes: filteredScenes };
    }).filter(c => 
      (c.title.toLowerCase().includes(term) && (!selectedTag || c.scenes?.some(s => s.tags?.includes(selectedTag)))) || 
      (c.scenes && c.scenes.length > 0)
    );
  }, [chapters, debouncedSearchTerm, selectedTag]);

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleFinishRename = (id: string, type: 'CHAPTER' | 'SCENE') => {
    const trimmedTitle = editTitle.trim();
    if (trimmedTitle && trimmedTitle !== '') {
      if (type === 'CHAPTER') onRenameChapter(id, trimmedTitle);
      else onRenameScene(id, trimmedTitle);
    }
    setEditingId(null);
  };

  return (
    <div className="w-full md:w-56 xl:w-72 2xl:w-80 h-full flex-shrink-0 glass rounded-none md:rounded-[32px] overflow-hidden flex flex-col shadow-soft border border-[var(--border-subtle)] transition-all duration-500">
      {/* Header del Navigatore */}
      <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--accent-soft)] rounded-lg">
            <Library className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">Navigator</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onExport}
            disabled={isExporting}
            className={cn(
              "p-2.5 rounded-xl transition-all border border-transparent active:scale-95",
              isExporting 
                ? "bg-[var(--bg-deep)] text-[var(--text-muted)]" 
                : "hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30"
            )}
            title="Esporta Manoscritto (.docx)"
          >
            <FileDown className={cn("w-4 h-4", isExporting && "animate-pulse")} />
          </button>
          <button 
            onClick={onCreateChapter} 
            className="p-2.5 hover:bg-[var(--accent-soft)] rounded-xl text-[var(--accent)] transition-all border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 active:scale-90"
            title="Nuovo Capitolo"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setNavigatorOpen(false)}
            className="md:hidden p-2.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            title="Chiudi Navigatore"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Ricerca Rapida */}
      <div className="px-6 pb-4 pt-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="Cerca... (Ctrl+F)"
            className="w-full bg-[var(--bg-deep)]/40 border border-[var(--border-subtle)] rounded-xl py-2 pl-9 pr-8 text-[10px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]/30 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-bright)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tag Filter Cloud */}
      {(allTags.length > 0 || selectedTag) && (
        <div className="px-6 pb-4 flex flex-wrap gap-1.5">
          {selectedTag && (
            <button 
              onClick={() => setSelectedTag(null)}
              className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest border border-red-500/20 flex items-center gap-1"
            >
              <X className="w-2.5 h-2.5" /> Clear Filter
            </button>
          )}
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={cn(
                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all",
                selectedTag === tag 
                  ? "bg-[var(--accent)] text-[var(--bg-deep)] border-transparent shadow-glow-mint" 
                  : "bg-[var(--bg-deep)]/40 text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Lista Capitoli e Scene con Drag & Drop */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onReorder}>
            <Droppable droppableId="manuscript-chapters" type="CHAPTER">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                  {filteredChapters.map((chapter, index) => (
                    <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} className={cn("space-y-1 transition-all", snapshot.isDragging && "z-50")}>
                          {/* Riga Capitolo */}
                          <div 
                            onClick={() => onToggleChapter(chapter.id)}
                            className={cn(
                              "flex items-center space-x-3 px-5 py-3.5 rounded-2xl cursor-pointer group transition-all border relative",
                              expandedChapters.has(chapter.id) 
                                ? "bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-inner" 
                                : "border-transparent hover:bg-[var(--accent-soft)] hover:border-[var(--border-subtle)]",
                              snapshot.isDragging && "bg-[var(--bg-card)] border-[var(--accent)]/50 shadow-2xl scale-[1.02]"
                            )}
                          >
                            <div {...provided.dragHandleProps} className="p-1 -ml-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--accent-soft)]">
                              <GripVertical className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            </div>
                            <div className="w-4 h-4 flex items-center justify-center">
                              {expandedChapters.has(chapter.id) ? 
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)]" /> : 
                                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              }
                            </div>
                            <Folder className={cn("w-4 h-4 transition-colors duration-500", expandedChapters.has(chapter.id) ? "text-[var(--accent)]" : "text-[var(--text-secondary)]")} />
                            {editingId === chapter.id ? (
                              <input
                                autoFocus
                                className="bg-[var(--bg-deep)] text-[11px] font-black text-[var(--text-bright)] uppercase tracking-tighter flex-1 border border-[var(--accent)]/30 rounded-lg px-2 py-1 outline-none"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleFinishRename(chapter.id, 'CHAPTER')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleFinishRename(chapter.id, 'CHAPTER');
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span 
                                onDoubleClick={(e) => handleStartRename(e, chapter.id, chapter.title)}
                                className={cn(
                                  "text-[11px] font-black flex-1 truncate uppercase tracking-tighter transition-colors duration-500",
                                  expandedChapters.has(chapter.id) ? "text-[var(--text-bright)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                                )}
                              >
                                {chapter.title}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChapter(chapter.id);
                              }}
                              className="p-1 px-2 text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                              title="Elimina Capitolo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <Plus 
                              onClick={(e) => {
                                e.stopPropagation();
                                onCreateScene(chapter.id);
                              }} 
                              className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--accent)] transition-all translate-x-1 group-hover:translate-x-0" 
                            />
                          </div>

                          {/* Lista Scene (Droppable) */}
                          {expandedChapters.has(chapter.id) && (
                            <Droppable droppableId={chapter.id} type="SCENE">
                              {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="pl-6 space-y-1.5 min-h-[12px] py-1 relative">
                                  {/* Vertical line indicator */}
                                  <div className="absolute left-[13px] top-0 bottom-0 w-[1px] bg-[var(--border-subtle)]" />
                                  
                                  {chapter.scenes?.map((scene, index) => (
                                    <Draggable key={scene.id} draggableId={scene.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div 
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          onClick={() => onSelectScene(scene.id)}
                                          className={cn(
                                            "flex flex-col p-3 rounded-xl cursor-pointer transition-all group/scene border relative",
                                            activeSceneId === scene.id 
                                              ? "bg-[var(--accent)] text-[var(--bg-deep)] border-transparent shadow-lg" 
                                              : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-bright)] border-transparent",
                                            snapshot.isDragging && "bg-[var(--bg-card)] shadow-2xl border-[var(--accent)]/50 z-50 scale-105"
                                          )}
                                        >
                                          {/* Tags sopra */}
                                          <div className="flex flex-wrap gap-1 mb-2">
                                            {scene.tags?.map(tag => (
                                              <span 
                                                key={tag} 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedTag(tag);
                                                }}
                                                className={cn(
                                                  "px-1.5 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-wider transition-all",
                                                  activeSceneId === scene.id 
                                                    ? "bg-white/20 text-white" 
                                                    : "bg-[var(--accent-soft)] text-[var(--accent)]"
                                                )}
                                              >
                                                #{tag}
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdateSceneTags(scene.id, scene.tags!.filter(t => t !== tag));
                                                  }}
                                                  className="ml-1 hover:text-red-400"
                                                >
                                                  ×
                                                </button>
                                              </span>
                                            ))}
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setTagInputId(tagInputId === scene.id ? null : scene.id);
                                              }}
                                              className={cn(
                                                "p-0.5 rounded-md transition-all opacity-40 hover:opacity-100",
                                                activeSceneId === scene.id ? "text-white" : "text-[var(--text-muted)]"
                                              )}
                                            >
                                              <Plus className="w-2.5 h-2.5" />
                                            </button>
                                          </div>

                                          {tagInputId === scene.id && (
                                            <div className="mb-2 p-2 glass rounded-xl border border-[var(--accent)]/30 animate-in slide-in-from-top-2 duration-300" onClick={e => e.stopPropagation()}>
                                              <input 
                                                autoFocus
                                                type="text"
                                                placeholder="Nuovo tag..."
                                                className="w-full bg-transparent text-[9px] font-black uppercase tracking-widest outline-none text-[var(--text-bright)] mb-2"
                                                value={newTag}
                                                onChange={e => setNewTag(e.target.value)}
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter' && newTag.trim()) {
                                                    const tags = scene.tags || [];
                                                    if (!tags.includes(newTag.trim())) {
                                                      onUpdateSceneTags(scene.id, [...tags, newTag.trim()]);
                                                    }
                                                    setNewTag('');
                                                    setTagInputId(null);
                                                  }
                                                  if (e.key === 'Escape') setTagInputId(null);
                                                }}
                                              />
                                              <div className="flex flex-wrap gap-1">
                                                {DEFAULT_TAGS.filter(t => !scene.tags?.includes(t)).map(t => (
                                                  <button 
                                                    key={t}
                                                    onClick={() => {
                                                      onUpdateSceneTags(scene.id, [...(scene.tags || []), t]);
                                                      setTagInputId(null);
                                                    }}
                                                    className="px-1.5 py-0.5 rounded-md bg-[var(--bg-deep)] text-[7px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all"
                                                  >
                                                    {t}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          <div className="flex items-center space-x-2">
                                            <div {...provided.dragHandleProps} className={cn(
                                              "p-1 rounded-lg opacity-0 group-hover/scene:opacity-100 transition-opacity",
                                              activeSceneId === scene.id ? "hover:bg-black/10" : "hover:bg-[var(--accent-soft)]"
                                            )}>
                                              <GripVertical className={cn("w-3.5 h-3.5", activeSceneId === scene.id ? "text-[var(--bg-deep)]/40" : "text-[var(--text-muted)]")} />
                                            </div>
                                            <FileText className={cn("w-4 h-4 transition-colors duration-500", activeSceneId === scene.id ? "text-[var(--bg-deep)]/70" : "text-[var(--text-muted)] group-hover/scene:text-[var(--accent)]/50")} />
                                            {editingId === scene.id ? (
                                              <input
                                                autoFocus
                                                className={cn(
                                                  "bg-[var(--bg-deep)] text-[11px] font-black uppercase tracking-tight flex-1 border border-[var(--accent)]/30 rounded-lg px-2 py-1 outline-none",
                                                  activeSceneId === scene.id ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                                                )}
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onBlur={() => handleFinishRename(scene.id, 'SCENE')}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') handleFinishRename(scene.id, 'SCENE');
                                                  if (e.key === 'Escape') setEditingId(null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                            ) : (
                                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <span 
                                                  onDoubleClick={(e) => handleStartRename(e, scene.id, scene.title)}
                                                  className={cn(
                                                    "text-[11px] truncate font-black uppercase tracking-tight transition-all duration-500",
                                                    activeSceneId === scene.id ? "text-[var(--bg-deep)]" : "text-[var(--text-secondary)]",
                                                    scene.exclude_from_timeline && "opacity-60 italic"
                                                  )}
                                                >
                                                  {scene.title}
                                                </span>
                                                
                                                {/* Status Badge */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const current = scene.status || 'draft';
                                                    const next = STATUSES[(STATUSES.indexOf(current) + 1) % STATUSES.length];
                                                    onUpdateSceneStatus(scene.id, next);
                                                  }}
                                                  className={cn(
                                                    "px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-widest border transition-all shrink-0",
                                                    activeSceneId === scene.id 
                                                      ? "bg-white/20 border-white/20 text-white" 
                                                      : cn(STATUS_CONFIG[scene.status || 'draft'].bg, "border-current")
                                                  )}
                                                  style={{ 
                                                    color: activeSceneId === scene.id ? undefined : STATUS_CONFIG[scene.status || 'draft'].color,
                                                    borderColor: activeSceneId === scene.id ? undefined : `${STATUS_CONFIG[scene.status || 'draft'].color}30`
                                                  }}
                                                >
                                                  {STATUS_CONFIG[scene.status || 'draft'].label}
                                                </button>
                                              </div>
                                            )}
                                            
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteScene(scene.id);
                                              }}
                                              className={cn(
                                                "flex items-center justify-center p-1.5 rounded-lg transition-all border border-transparent opacity-0 group-hover/scene:opacity-100 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10",
                                                activeSceneId === scene.id && "text-[var(--bg-deep)]/40 hover:text-[var(--bg-deep)]"
                                              )}
                                              title="Elimina Scena"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleSceneExclusion(scene.id, !scene.exclude_from_timeline);
                                              }}
                                              className={cn(
                                                "flex items-center justify-center p-1.5 rounded-lg transition-all border border-transparent opacity-0 group-hover/scene:opacity-100",
                                                scene.exclude_from_timeline 
                                                  ? "text-red-400 hover:bg-red-400/10 hover:border-red-400/20" 
                                                  : "text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]",
                                                activeSceneId === scene.id && "text-[var(--bg-deep)]/40 hover:text-[var(--bg-deep)] hover:bg-black/10"
                                              )}
                                              title={scene.exclude_from_timeline ? "Includi nella timeline" : "Escludi dalla timeline (Bozza)"}
                                            >
                                              {scene.exclude_from_timeline ? (
                                                <EyeOff className="w-3.5 h-3.5" />
                                              ) : (
                                                <Eye className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
};
