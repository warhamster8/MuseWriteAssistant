import React from 'react';
import { Plus, ChevronDown, ChevronRight, FileText, Folder, GripVertical, Library, FileDown } from 'lucide-react';
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
  return (
    <div className="w-64 xl:w-72 flex-shrink-0 glass rounded-[32px] overflow-hidden flex flex-col shadow-soft border border-white/5 mx-1 my-1 transition-all duration-500">
      {/* Header del Navigatore */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#5be9b1]/10 rounded-lg">
            <Library className="w-4 h-4 text-[#5be9b1]" />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Navigator</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onExport}
            disabled={isExporting}
            className={cn(
              "p-2.5 rounded-xl transition-all border border-transparent active:scale-95",
              isExporting 
                ? "bg-slate-800 text-slate-500" 
                : "hover:bg-[#5be9b1]/10 text-slate-500 hover:text-[#5be9b1] hover:border-[#5be9b1]/30"
            )}
            title="Esporta Manoscritto (.docx)"
          >
            <FileDown className={cn("w-4 h-4", isExporting && "animate-pulse")} />
          </button>
          <button 
            onClick={onCreateChapter} 
            className="p-2.5 hover:bg-[#5be9b1]/10 rounded-xl text-[#5be9b1] transition-all border border-white/5 hover:border-[#5be9b1]/30 active:scale-90"
            title="Nuovo Capitolo"
          >
            <Plus className="w-4 h-4" />
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
                              ? "bg-white/[0.03] border-white/5 shadow-inner" 
                              : "border-transparent hover:bg-white/[0.02] hover:border-white/5",
                            snapshot.isDragging && "bg-[#1a1f24] border-[#5be9b1]/50 shadow-2xl scale-[1.02]"
                          )}
                        >
                          <div {...provided.dragHandleProps} className="p-1 -ml-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10">
                            <GripVertical className="w-3.5 h-3.5 text-slate-700" />
                          </div>
                          <div className="w-4 h-4 flex items-center justify-center">
                            {expandedChapters.has(chapter.id) ? 
                              <ChevronDown className="w-3.5 h-3.5 text-[#5be9b1]" /> : 
                              <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                            }
                          </div>
                          <Folder className={cn("w-4 h-4 transition-colors duration-500", expandedChapters.has(chapter.id) ? "text-[#5be9b1]" : "text-slate-800")} />
                          {editingId === chapter.id ? (
                            <input
                              autoFocus
                              className="bg-[#121519] text-[11px] font-black text-slate-100 uppercase tracking-tighter flex-1 border border-[#5be9b1]/30 rounded-lg px-2 py-1 outline-none"
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
                                expandedChapters.has(chapter.id) ? "text-slate-100" : "text-slate-500 group-hover:text-slate-300"
                              )}
                            >
                              {chapter.title}
                            </span>
                          )}
                          <Plus 
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateScene(chapter.id);
                            }} 
                            className="w-4 h-4 text-slate-700 opacity-0 group-hover:opacity-100 hover:text-[#5be9b1] transition-all translate-x-1 group-hover:translate-x-0" 
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
                                <div className="absolute left-[13px] top-0 bottom-0 w-[1px] bg-white/5" />
                                
                                {chapter.scenes?.map((scene, index) => (
                                  <Draggable key={scene.id} draggableId={scene.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div 
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        onClick={() => onSelectScene(scene.id)}
                                        className={cn(
                                          "flex items-center space-x-4 px-5 py-3 rounded-xl cursor-pointer transition-all group/scene border relative",
                                          activeSceneId === scene.id 
                                            ? "bg-[#5be9b1] text-[#0b0e11] border-transparent shadow-[0_8px_16px_rgba(91,233,177,0.2)]" 
                                            : "text-slate-600 hover:bg-white/5 hover:text-slate-300 border-transparent",
                                          snapshot.isDragging && "bg-[#1a1f24] shadow-2xl border-[#5be9b1]/50 z-50 scale-105"
                                        )}
                                      >
                                        <div {...provided.dragHandleProps} className={cn(
                                          "p-1 rounded-lg opacity-0 group-hover/scene:opacity-100 transition-opacity",
                                          activeSceneId === scene.id ? "hover:bg-black/10" : "hover:bg-white/10"
                                        )}>
                                          <GripVertical className={cn("w-3.5 h-3.5", activeSceneId === scene.id ? "text-black/40" : "text-slate-800")} />
                                        </div>
                                        <FileText className={cn("w-4 h-4 transition-colors duration-500", activeSceneId === scene.id ? "text-[#0b0e11]/70" : "text-slate-800 group-hover/scene:text-[#5be9b1]/50")} />
                                        {editingId === scene.id ? (
                                          <input
                                            autoFocus
                                            className={cn(
                                              "bg-[#121519] text-[11px] font-black uppercase tracking-tight flex-1 border border-[#5be9b1]/30 rounded-lg px-2 py-1 outline-none",
                                              activeSceneId === scene.id ? "text-[#5be9b1]" : "text-slate-300"
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
                                              "text-[11px] truncate font-black uppercase tracking-tight transition-all duration-500",
                                              activeSceneId === scene.id ? "text-[#0b0e11] translate-x-1" : "text-slate-600"
                                            )}
                                          >
                                            {scene.title}
                                          </span>
                                        )}
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
