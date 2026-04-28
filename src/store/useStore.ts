import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chapter } from '../types/narrative';
import type { AIConfig } from '../lib/aiService';
import type { GlobalTimelineEvent } from '../types/timeline';
import { parseAIAnalysis, type AISuggestion } from '../lib/aiParsing';

const syncSuggestions = (state: AppState, analysisText: string, sceneId: string, tabId: string) => {
  if (tabId === 'revision' || tabId === 'grammar') {
    const allSuggestions = (analysisText && analysisText.trim()) ? parseAIAnalysis(analysisText) : [];
    const ignored = state.ignoredSuggestions?.[sceneId] || [];
    const visible = allSuggestions.filter(s => !ignored.includes(s.original));
    
    let newIndex = state.suggestionIndex;
    if (visible.length > 0) {
      // Se avevamo un indice valido, cerchiamo di mantenerlo o agganciarlo all'ultimo disponibile
      if (newIndex === -1) newIndex = 0;
      else newIndex = Math.min(newIndex, visible.length - 1);
    } else {
      newIndex = -1;
    }

    return {
      parsedSuggestions: visible,
      suggestionIndex: newIndex,
      totalSuggestionsCount: allSuggestions.length
    };
  }
  return { parsedSuggestions: [], suggestionIndex: -1 };
};

export type ViewTab = 'narrative' | 'characters' | 'world' | 'notes' | 'analysis' | 'config' | 'timeline';
export type SidekickTab = 'revision' | 'grammar' | 'braindump' | 'transformer' | 'lexicon';

interface User {
  id: string;
  email?: string;
}

interface Project {
  id: string;
  title: string;
  timeline_events?: GlobalTimelineEvent[];
}


interface AppState {
  user: User | null;
  currentProject: Project | null;
  activeTab: ViewTab;
  activeSceneId: string | null;
  currentSceneContent: string;
  chapters: Chapter[];
  isLocalMode: boolean;
  isLoading: boolean;
  activeSuggestions: string[];
  ignoredSuggestions: Record<string, string[]>;
  lastAnalyzedPhrase: Record<string, string>;
  sceneAnalysis: Record<string, string>;
  aiConfig: AIConfig;
  groqKey: string | null;
  analysisRequestToken: number;
  authorName: string;
  isSidekickOpen: boolean;
  isNavigatorOpen: boolean;
  isZenMode: boolean;
  timelineEvents: GlobalTimelineEvent[];
  sidekickTab: SidekickTab;
  
  parsedSuggestions: AISuggestion[];
  suggestionIndex: number;
  totalSuggestionsCount: number;
  
  activeSelection: string | null;
  highlightedText: string | null;
  scrollRequestToken: number;
  theme: 'dark' | 'light';
  
  setUser: (user: User | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setActiveTab: (tab: ViewTab) => void;
  setActiveSceneId: (id: string | null) => void;
  setCurrentSceneContent: (content: string) => void;
  setChapters: (chapters: Chapter[]) => void;
  setLocalMode: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  setActiveSuggestions: (suggestions: string[]) => void;
  addIgnoredSuggestion: (sceneId: string, suggestion: string) => void;
  setLastAnalyzedPhrase: (sceneId: string, phrase: string | ((prev: string) => string), tabId?: string) => void;
  setSceneAnalysis: (sceneId: string, analysis: string | ((prev: string) => string), tabId?: string) => void;
  setAIConfig: (config: Partial<AIConfig>) => void;
  setActiveSelection: (selection: string | null) => void;
  setHighlightedText: (text: string | null) => void;
  requestAnalysis: () => void;
  requestScrollToHighlight: () => void;
  setAuthorName: (name: string) => void;
  setSidekickOpen: (enabled: boolean) => void;
  setNavigatorOpen: (enabled: boolean) => void;
  setZenMode: (enabled: boolean) => void;
  setTimelineEvents: (events: GlobalTimelineEvent[]) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setSidekickTab: (tab: SidekickTab) => void;
  clearSceneAnalysis: (sceneId: string, tabId: SidekickTab) => void;
  setParsedSuggestions: (suggestions: AISuggestion[]) => void;
  setSuggestionIndex: (index: number | ((prev: number) => number)) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      currentProject: null,
      activeTab: 'narrative',
      activeSceneId: null,
      currentSceneContent: '',
      chapters: [],
      isLocalMode: false,
      isLoading: false,
      activeSuggestions: [],
      ignoredSuggestions: {},
      lastAnalyzedPhrase: {}, // Key: `${sceneId}-${tabId}`
      sceneAnalysis: {},      // Key: `${sceneId}-${tabId}`
      aiConfig: {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        deepseekKey: '',
        geminiKey: '',
        groqKey: ''
      },
      groqKey: null,
      analysisRequestToken: 0,
      authorName: '',
      isSidekickOpen: true,
      isNavigatorOpen: true,
      isZenMode: false,
      timelineEvents: [],
      activeSelection: null,
      highlightedText: null,
      scrollRequestToken: 0,
      theme: 'dark',
      sidekickTab: 'revision',
      parsedSuggestions: [],
      suggestionIndex: -1,
      totalSuggestionsCount: 0,
      
      setUser: (user) => set({ user }),
      setCurrentProject: (project) => set({ currentProject: project }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveSceneId: (id) => set((state) => {
        const currentTab = state.sidekickTab || 'revision';
        const analysis = id ? state.sceneAnalysis[`${id}-${currentTab}`] || '' : '';
        const synced = syncSuggestions(state, analysis, id || '', currentTab);
        return { activeSceneId: id, ...synced };
      }),
      setCurrentSceneContent: (content) => set({ currentSceneContent: content }),
      setChapters: (chapters) => set({ chapters }),
      setLocalMode: (enabled) => set({ isLocalMode: enabled, user: null, currentProject: null }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => set({ user: null, currentProject: null, isLocalMode: false }),
      setActiveSuggestions: (suggestions) => set({ activeSuggestions: suggestions }),
      addIgnoredSuggestion: (sceneId, suggestion) => set((state) => {
        const newIgnored = {
          ...(state.ignoredSuggestions || {}),
          [sceneId]: [...((state.ignoredSuggestions || {})[sceneId] || []), suggestion]
        };
        const analysis = sceneId ? state.sceneAnalysis[`${sceneId}-${state.sidekickTab}`] || '' : '';
        const synced = syncSuggestions({ ...state, ignoredSuggestions: newIgnored }, analysis, sceneId, state.sidekickTab);
        return {
          ignoredSuggestions: newIgnored,
          ...synced
        };
      }),
      setLastAnalyzedPhrase: (sceneId, phrase, tabId = 'revision') => set((state) => {
        const key = `${sceneId}-${tabId}`;
        const current = state.lastAnalyzedPhrase?.[key] || '';
        const next = typeof phrase === 'function' ? phrase(current) : phrase;
        return {
          lastAnalyzedPhrase: {
            ...(state.lastAnalyzedPhrase || {}),
            [key]: next
          }
        };
      }),
      setSceneAnalysis: (sceneId, analysis, tabId = 'revision') => set((state) => {
        const key = `${sceneId}-${tabId}`;
        const current = state.sceneAnalysis?.[key] || '';
        const next = typeof analysis === 'function' ? analysis(current) : analysis;
        
        if (sceneId === state.activeSceneId && tabId === state.sidekickTab) {
          const synced = syncSuggestions(state, next, sceneId, tabId);
          return {
            sceneAnalysis: { ...(state.sceneAnalysis || {}), [key]: next },
            ...synced
          };
        }

        return {
          sceneAnalysis: { ...(state.sceneAnalysis || {}), [key]: next }
        };
      }),
      setAIConfig: (config) => set((state) => ({
        aiConfig: { ...state.aiConfig, ...config }
      })),
      setActiveSelection: (selection) => set({ activeSelection: selection }),
      setHighlightedText: (text) => set({ highlightedText: text }),
      requestAnalysis: () => set((state) => ({ analysisRequestToken: state.analysisRequestToken + 1 })),
      requestScrollToHighlight: () => set((state) => ({ scrollRequestToken: state.scrollRequestToken + 1 })),
      setAuthorName: (authorName) => set({ authorName }),
      setSidekickOpen: (isSidekickOpen) => set({ isSidekickOpen }),
      setNavigatorOpen: (isNavigatorOpen) => set({ isNavigatorOpen }),
      setZenMode: (isZenMode) => set({ isZenMode }),
      setTimelineEvents: (timelineEvents) => set({ timelineEvents }),
      setTheme: (theme) => set({ theme }),
      setSidekickTab: (sidekickTab) => set((state) => {
        const analysis = state.activeSceneId ? state.sceneAnalysis[`${state.activeSceneId}-${sidekickTab}`] || '' : '';
        const synced = syncSuggestions(state, analysis, state.activeSceneId || '', sidekickTab);
        return { sidekickTab, ...synced };
      }),

      clearSceneAnalysis: (sceneId, tabId) => set((state) => {
        const key = `${sceneId}-${tabId}`;
        const newAnalysis = { ...(state.sceneAnalysis || {}) };
        delete newAnalysis[key];
        
        const newPhrases = { ...(state.lastAnalyzedPhrase || {}) };
        delete newPhrases[key];

        const synced = syncSuggestions(state, '', sceneId, tabId);
        
        return {
          sceneAnalysis: newAnalysis,
          lastAnalyzedPhrase: newPhrases,
          ...synced
        };
      }),
      setParsedSuggestions: (suggestions) => set({ parsedSuggestions: suggestions }),
      setSuggestionIndex: (index) => set((state) => ({ 
        suggestionIndex: typeof index === 'function' ? index(state.suggestionIndex) : index 
      })),
    }),
    {
      name: 'muse-storage',
      partialize: (state) => ({ 
        user: state.user, 
        currentProject: state.currentProject, 
        isLocalMode: state.isLocalMode,
        activeTab: state.activeTab,
        sidekickTab: state.sidekickTab,
        ignoredSuggestions: state.ignoredSuggestions || {},
        lastAnalyzedPhrase: state.lastAnalyzedPhrase || {},
        sceneAnalysis: state.sceneAnalysis || {},
        suggestionIndex: state.suggestionIndex,
        authorName: state.authorName || '',
        isSidekickOpen: state.isSidekickOpen !== undefined ? state.isSidekickOpen : true,
        isNavigatorOpen: state.isNavigatorOpen !== undefined ? state.isNavigatorOpen : true,
        isZenMode: state.isZenMode || false,
        timelineEvents: state.timelineEvents || [],
        theme: state.theme || 'dark',
        currentSceneContent: state.currentSceneContent || '',
        chapters: state.chapters || [],
        aiConfig: {
          ...state.aiConfig,
          deepseekKey: '', // Mai persistere la chiave nel localStorage
          geminiKey: '',
          groqKey: ''
        }
      }),
    }
  )
);
