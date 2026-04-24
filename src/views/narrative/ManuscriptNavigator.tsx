import React from 'react';
import { Plus, ChevronDown, ChevronRight, FileText, Folder, GripVertical, Library, FileDown, Eye, EyeOff, X, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { cn } from '../../lib/utils';
import type { Chapter } from '../../types/narrative';

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
  onExport: () => void;
  isExporting: boolean;
}


/**
 * Mattoncino: ManuscriptNavigator
 * 
 * Perché esiste: Separa la logica di navigazione e Drag & Drop dal core dell'editor.
 * Cosa fa: Renderizza l'albero gerarchico dei capitoli e permette il riordinamento delle scene.
 */
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
  onExport,
  isExporting
}) => {

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');

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
  const setNavigatorOpen = useStore(s => s.setNavigatorOpen);

  return (
    <div className="w-full md:w-56 xl:w-72 2xl:w-80 h-full flex-shrink-0 glass rounded-none md:rounded-[40px] overflow-hidden flex flex-col shadow-soft border border-[var(--border-subtle)] md:mx-1 md:my-1 transition-all duration-500">
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
      
      {/* Lista Capitoli e Scene con Drag & Drop */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        <DragDropContext onDragEnd={onReorder}>
          <Droppable droppableId="manuscript-chapters" type="CHAPTER">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {chapters.map((chapter, index) => (
                  <Draggable key={chapter.id} draggableId={chapter.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "space-y-1 transition-all",
                          snapshot.isDragging && "z-50"
                        )}
                      >
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
                              <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="pl-6 space-y-1.5 min-h-[12px] py-1 relative"
                              >
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
                                          "flex items-center space-x-2 px-3 py-3 rounded-xl cursor-pointer transition-all group/scene border relative",
                                          activeSceneId === scene.id 
                                            ? "bg-[var(--accent)] text-[var(--bg-deep)] border-transparent shadow-lg" 
                                            : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-bright)] border-transparent",
                                          snapshot.isDragging && "bg-[var(--bg-card)] shadow-2xl border-[var(--accent)]/50 z-50 scale-105"
                                        )}
                                      >
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
                                          <span 
                                            onDoubleClick={(e) => handleStartRename(e, scene.id, scene.title)}
                                            className={cn(
                                              "text-[11px] truncate font-black uppercase tracking-tight transition-all duration-500 flex-1 min-w-0",
                                              activeSceneId === scene.id ? "text-[var(--bg-deep)]" : "text-[var(--text-secondary)]",
                                              scene.exclude_from_timeline && "opacity-60 italic"
                                            )}
                                          >
                                            {scene.title}
                                            {scene.exclude_from_timeline && " (BOZZA)"}
                                          </span>
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
      </div>
    </div>

  );
};
