import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from '../components/Toast';

export function useKeyboardShortcuts() {
  const { 
    activeTab, 
    setActiveTab, 
    activeSceneId, 
    setActiveSceneId, 
    chapters,
    setSidekickOpen,
    isSidekickOpen,
  } = useStore();
  const { addToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // 1. Tab Switching (Ctrl/Cmd + 1-6)
      if (isMod && e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        const tabs: any[] = ['narrative', 'characters', 'world', 'notes', 'analysis', 'config', 'timeline'];
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
          setActiveTab(tabs[index]);
          showShortcutHint('Ctrl + ' + e.key, 'Passa a ' + tabs[index]);
        }
      }

      // 2. Save (Ctrl/Cmd + S)
      if (isMod && e.key === 's') {
        e.preventDefault();
        addToast('Scena salvata correttamente', 'success');
        showShortcutHint('Ctrl + S', 'Salvataggio rapido');
      }

      // 3. New Scene (Ctrl/Cmd + N)
      if (isMod && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('muse-shortcut-new-scene'));
        showShortcutHint('Ctrl + N', 'Nuova scena');
      }

      // 4. Global Search (Ctrl/Cmd + F)
      if (isMod && e.key === 'f') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('muse-shortcut-search'));
        showShortcutHint('Ctrl + F', 'Ricerca globale');
      }

      // 5. Escape (Close Modals/Sidekick)
      if (e.key === 'Escape') {
        if (isSidekickOpen) setSidekickOpen(false);
        // We don't necessarily close Navigator on Escape as it's a primary UI element,
        // but the user asked for "Escape: Chiude modali/sidekick"
        window.dispatchEvent(new CustomEvent('muse-shortcut-escape'));
      }

      // 6. Navigation (Arrow Left/Right) - Only if not in input
      if (!isInput && activeTab === 'narrative') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const allScenes = chapters.flatMap(c => c.scenes || []);
          if (allScenes.length === 0) return;
          
          const currentIndex = allScenes.findIndex(s => s.id === activeSceneId);
          if (e.key === 'ArrowRight') {
            const next = allScenes[currentIndex + 1] || allScenes[0];
            setActiveSceneId(next.id);
          } else {
            const prev = allScenes[currentIndex - 1] || allScenes[allScenes.length - 1];
            setActiveSceneId(prev.id);
          }
        }
      }
    };

    const showShortcutHint = (shortcut: string, action: string) => {
      const hasShown = localStorage.getItem('muse_shortcut_hint_shown');
      if (!hasShown) {
        addToast(`Shortcut: ${shortcut} per ${action}`, 'info');
        localStorage.setItem('muse_shortcut_hint_shown', 'true');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeSceneId, chapters, isSidekickOpen]);
}
