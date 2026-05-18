import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AIInsightResult, AISearchResult, AIService } from './ai/index';

// ─── Types ────────────────────────────────────────────────────────────

export interface Idea {
  id: string;
  title: string;
  content: string;
  source: string;
  folderId: string;
  tags: string[];
  connections: string[]; // ids of connected ideas
  createdAt: number;     // unix ms — serialises cleanly through JSON
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  childrenIds: string[];
  colorKey: FolderColor; // drives node colour in graph
  createdAt: number;
}

export type FolderColor =
  | 'orange'
  | 'blue'
  | 'green'
  | 'purple'
  | 'pink'
  | 'teal'
  | 'amber'
  | 'red';

export interface Edge {
  id: string;           // `${sourceId}__${targetId}` 
  sourceId: string;
  targetId: string;
}

export interface Draft {
  title: string;
  content: string;
  source: string;
  folderId: string;
  tags: string[];
  updatedAt: number;
}

// ─── Graph node (derived, never stored) ──────────────────────────────

export interface GraphNode {
  id: string;
  label: string;        // content truncated to ~30 chars
  folderId: string;
  folderColor: FolderColor;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: string[];
}

// ─── Store shape ─────────────────────────────────────────────────────────────

interface AppState {
  // ── persisted data ──
  ideas: Record<string, Idea>;
  folders: Record<string, Folder>;
  edges: Edge[];
  draft: Draft | null;

  // ── ui / navigation (not persisted) ──
  selectedNodeId: string | null;
  selectedFolderId: string | null;
  selectedFolderIds: string[];
  searchQuery: string;

  // ai state (not persisted)
  aiSearchResults: AISearchResult | null;
  aiInsights: AIInsightResult | null;
  isAILoading: boolean;
  aiError: string | null;

  // ── idea actions ──
  addIdea: (payload: Pick<Idea, 'title' | 'content' | 'source' | 'folderId' | 'tags'>) => string;
  updateIdea: (id: string, updates: Partial<Pick<Idea, 'title' | 'content' | 'source' | 'folderId' | 'tags'>>) => void;
  deleteIdea: (id: string) => void;
  connectIdeas: (idA: string, idB: string) => void;
  disconnectIdeas: (idA: string, idB: string) => void;

  // ── folder actions ──
  createFolder: (payload: Pick<Folder, 'name' | 'parentId' | 'colorKey'>) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // ── draft ──
  saveDraft: (d: Omit<Draft, 'updatedAt'>) => void;
  clearDraft: () => void;
  restoreDraft: () => Draft | null;

  // ── ui ──
  selectNode: (id: string | null) => void;
  selectFolderSingle: (id: string | null) => void;
  selectFolderMulti: (folderId: string | null) => void;
  setSearchQuery: (q: string) => void;

  // ai methods
  aiSearchIdeas: (query: string, k?: number) => Promise<AISearchResult | null>;
  aiGenerateInsights: () => Promise<AIInsightResult | null>;
  aiInitializeEmbeddings: () => Promise<void>;
  aiUpdateIdeaEmbedding: (ideaId: string) => Promise<void>;
  aiClearError: () => void;

  // ── derived selectors (call as functions) ──
  getFilteredIdeas: () => Idea[];
  getVisibleGraphNodes: () => GraphNode[];
  getEdgesForVisibleNodes: () => Edge[];
  getFolderTree: () => Folder[];
  getIdeasInFolder: (folderId: string) => Idea[];
  getFolderById: (id: string) => Folder | undefined;
  getIdeaById: (id: string) => Idea | undefined;
  hasDraft: () => boolean;
}

// ─── Folder colour palette ────────────────────────────────────────────────────

const COLOR_CYCLE: FolderColor[] = [
  'blue', 'purple', 'green', 'teal', 'amber', 'pink', 'red', 'orange',
];

let _colorIndex = 0;
const nextColor = (): FolderColor => COLOR_CYCLE[_colorIndex++ % COLOR_CYCLE.length];

// ─── Default seed data ────────────────────────────────────────────────────────

const DEFAULT_FOLDERS: Folder[] = [
  { id: 'uncategorized', name: 'Uncategorized', parentId: null, childrenIds: [], colorKey: 'orange', createdAt: 0 },
  { id: 'f-philosophy',  name: 'Philosophy',    parentId: null, childrenIds: ['f-ethics'], colorKey: 'blue',   createdAt: 1 },
  { id: 'f-science',     name: 'Science',       parentId: null, childrenIds: ['f-physics'], colorKey: 'green', createdAt: 2 },
  { id: 'f-literature',  name: 'Literature',    parentId: null, childrenIds: [],            colorKey: 'purple',createdAt: 3 },
  { id: 'f-history',     name: 'History',       parentId: null, childrenIds: [],            colorKey: 'amber', createdAt: 4 },
  { id: 'f-ethics',      name: 'Ethics',        parentId: 'f-philosophy', childrenIds: [],  colorKey: 'teal',  createdAt: 5 },
  { id: 'f-physics',     name: 'Physics',       parentId: 'f-science',    childrenIds: [],  colorKey: 'pink',  createdAt: 6 },
];

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── initial state ──────────────────────────────────────────────────────

      ideas: {},
      folders: Object.fromEntries(DEFAULT_FOLDERS.map(f => [f.id, f])),
      edges: [],
      draft: null,

      selectedNodeId: null,
      selectedFolderId: null,
      selectedFolderIds: [],
      searchQuery: '',

      // ai state
      aiSearchResults: null,
      aiInsights: null,
      isAILoading: false,
      aiError: null,

      // ── idea actions ───────────────────────────────────────────────────────

      addIdea: (payload) => {
        const id = `idea-${Date.now()}`;
        const now = Date.now();
        const idea: Idea = {
          ...payload,
          id,
          title: payload.title || '',
          connections: [],
          createdAt: now,
          updatedAt: now,
        };
        set(s => ({ ideas: { ...s.ideas, [id]: idea }, draft: null }));
        return id;
      },

      updateIdea: (id, updates) => {
        set(s => {
          const idea = s.ideas[id];
          if (!idea) return s;
          return {
            ideas: {
              ...s.ideas,
              [id]: { ...idea, ...updates, updatedAt: Date.now() },
            },
          };
        });
      },

      deleteIdea: (id) => {
        set(s => {
          const ideas = { ...s.ideas };
          delete ideas[id];
          // Remove from all connection lists
          Object.values(ideas).forEach(idea => {
            if (idea.connections.includes(id)) {
              ideas[idea.id] = {
                ...idea,
                connections: idea.connections.filter(c => c !== id),
              };
            }
          });
          const edges = s.edges.filter(e => e.sourceId !== id && e.targetId !== id);
          return { ideas, edges };
        });
      },

      connectIdeas: (idA, idB) => {
        const edgeId = [idA, idB].sort().join('__');
        set(s => {
          if (s.edges.find(e => e.id === edgeId)) return s; // already connected
          const ideas = { ...s.ideas };
          const a = ideas[idA];
          const b = ideas[idB];
          if (!a || !b) return s;
          ideas[idA] = { ...a, connections: [...a.connections, idB] };
          ideas[idB] = { ...b, connections: [...b.connections, idA] };
          return {
            ideas,
            edges: [...s.edges, { id: edgeId, sourceId: idA, targetId: idB }],
          };
        });
      },

      disconnectIdeas: (idA, idB) => {
        const edgeId = [idA, idB].sort().join('__');
        set(s => {
          const ideas = { ...s.ideas };
          const a = ideas[idA];
          const b = ideas[idB];
          if (a) ideas[idA] = { ...a, connections: a.connections.filter(c => c !== idB) };
          if (b) ideas[idB] = { ...b, connections: b.connections.filter(c => c !== idA) };
          return { ideas, edges: s.edges.filter(e => e.id !== edgeId) };
        });
      },

      // ── folder actions ─────────────────────────────────────────────────────

      createFolder: (payload) => {
        const id = `folder-${Date.now()}`;
        const folder: Folder = {
          ...payload,
          id,
          childrenIds: [],
          colorKey: payload.colorKey ?? nextColor(),
          createdAt: Date.now(),
        };
        set(s => {
          const folders = { ...s.folders, [id]: folder };
          if (payload.parentId && folders[payload.parentId]) {
            folders[payload.parentId] = {
              ...folders[payload.parentId],
              childrenIds: [...folders[payload.parentId].childrenIds, id],
            };
          }
          return { folders };
        });
        return id;
      },

      renameFolder: (id, name) => {
        set(s => {
          const folder = s.folders[id];
          if (!folder) return s;
          return { folders: { ...s.folders, [id]: { ...folder, name } } };
        });
      },

      deleteFolder: (id) => {
        if (id === 'uncategorized') return; // protected
        set(s => {
          const folders = { ...s.folders };
          const folder = folders[id];
          if (!folder) return s;

          // Move child folders to parent
          folder.childrenIds.forEach(childId => {
            if (folders[childId]) {
              folders[childId] = { ...folders[childId], parentId: folder.parentId };
            }
          });

          // Remove from parent
          if (folder.parentId && folders[folder.parentId]) {
            folders[folder.parentId] = {
              ...folders[folder.parentId],
              childrenIds: folders[folder.parentId].childrenIds
                .filter(c => c !== id)
                .concat(folder.childrenIds),
            };
          }
          delete folders[id];

          // Delete all ideas in this folder and their connections
          const ideas = { ...s.ideas };
          const edges = [...s.edges];
          const ideasToDelete: string[] = [];

          // Find all ideas in this folder
          Object.values(ideas).forEach(idea => {
            if (idea.folderId === id) {
              ideasToDelete.push(idea.id);
            }
          });

          // Delete the ideas and remove their connections
          ideasToDelete.forEach(ideaId => {
            delete ideas[ideaId];
            // Remove all edges connected to this idea
            edges.splice(0, edges.length, ...edges.filter(edge => 
              edge.sourceId !== ideaId && edge.targetId !== ideaId
            ));
          });

          // Remove connections from other ideas to deleted ideas
          Object.values(ideas).forEach(idea => {
            ideas[idea.id] = {
              ...idea,
              connections: idea.connections.filter(connId => !ideasToDelete.includes(connId))
            };
          });

          return { folders, ideas, edges };
        });
      },

      // ── draft ──────────────────────────────────────────────────────────────

      saveDraft: (d) => set({ draft: { ...d, updatedAt: Date.now() } }),
      clearDraft: () => set({ draft: null }),
      restoreDraft: () => get().draft,

      // ── ui ─────────────────────────────────────────────────────────────────

      selectNode: (id) => set({ selectedNodeId: id }),
      selectFolderSingle: (folderId) => {
        set({ selectedFolderId: folderId });
      },
      selectFolderMulti: (folderId) => {
        const { selectedFolderIds } = get();
        if (folderId === null) {
          set({ selectedFolderIds: [] });
        } else if (selectedFolderIds.includes(folderId)) {
          set({ selectedFolderIds: selectedFolderIds.filter(id => id !== folderId) });
        } else {
          set({ selectedFolderIds: [...selectedFolderIds, folderId] });
        }
      },
      setSearchQuery: (q) => set({ searchQuery: q }),

      // ai methods
      aiSearchIdeas: async (query: string, k: number = 5) => {
        const { ideas } = get();
        set({ isAILoading: true, aiError: null });
        
        try {
          const results = await AIService.searchIdeas(query, Object.values(ideas), k);
          set({ aiSearchResults: results, isAILoading: false });
          return results;
        } catch (error) {
          set({ aiError: error instanceof Error ? error.message : "Search failed", isAILoading: false });
          return null;
        }
      },

      aiGenerateInsights: async () => {
        const { ideas } = get();
        set({ isAILoading: true, aiError: null });
        
        try {
          const insights = await AIService.generateInsights(Object.values(ideas));
          set({ aiInsights: insights, isAILoading: false });
          return insights;
        } catch (error) {
          set({ aiError: error instanceof Error ? error.message : "Insight generation failed", isAILoading: false });
          return null;
        }
      },

      aiInitializeEmbeddings: async () => {
        const { ideas } = get();
        try {
          await AIService.initializeEmbeddings(Object.values(ideas));
        } catch (error) {
          set({ aiError: error instanceof Error ? error.message : "Embedding initialization failed" });
        }
      },

      aiUpdateIdeaEmbedding: async (ideaId: string) => {
        const { ideas } = get();
        const idea = ideas[ideaId];
        if (!idea) return;
        
        try {
          await AIService.updateIdeaEmbedding(idea);
        } catch (error) {
          set({ aiError: error instanceof Error ? error.message : "Embedding update failed" });
        }
      },

      aiClearError: () => set({ aiError: null }),

      // ── derived selectors ──────────────────────────────────────────────────

      getFilteredIdeas: () => {
        const { ideas, selectedFolderId, selectedFolderIds, searchQuery } = get();
        let list = Object.values(ideas);

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          list = list.filter(
            i =>
              i.title?.toLowerCase().includes(q) ||
              i.content.toLowerCase().includes(q) ||
              i.source.toLowerCase().includes(q) ||
              i.tags.some(t => t.toLowerCase().includes(q))
          );
        }

        // Use single-select for HomeScreen, multi-select for Graph
        if (selectedFolderId) {
          list = list.filter(i => i.folderId === selectedFolderId);
        } else if (selectedFolderIds.length > 0) {
          list = list.filter(i => selectedFolderIds.includes(i.folderId));
        }

        return list.sort((a, b) => b.createdAt - a.createdAt);
      },

      getVisibleGraphNodes: () => {
        const { folders } = get();
        const ideas = get().getFilteredIdeas();
        const W = 360;
        const H = 600;

        return ideas.map((idea, i) => {
          const folder = folders[idea.folderId];
          // Deterministic initial position from id hash so nodes don't jump on re-render
          const seed = hashCode(idea.id);
          const angle = (seed % 1000) / 1000 * Math.PI * 2;
          const radius = 60 + (seed % 200);

          return {
            id: idea.id,
            label: idea.content.length > 28
              ? idea.content.slice(0, 28) + '…'
              : idea.content,
            folderId: idea.folderId,
            folderColor: folder?.colorKey ?? 'orange',
            x: W / 2 + Math.cos(angle) * radius,
            y: H / 2 + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            connections: idea.connections,
          };
        });
      },

      getEdgesForVisibleNodes: () => {
        const { edges } = get();
        const visible = new Set(get().getVisibleGraphNodes().map(n => n.id));
        return edges.filter(e => visible.has(e.sourceId) && visible.has(e.targetId));
      },

      getFolderTree: () => {
        const { folders } = get();
        return Object.values(folders)
          .filter(f => f.parentId === null)
          .sort((a, b) => a.createdAt - b.createdAt);
      },

      getIdeasInFolder: (folderId) => {
        const ids = collectFolderIds(get().folders, folderId);
        return Object.values(get().ideas)
          .filter(i => ids.has(i.folderId))
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      getFolderById: (id) => get().folders[id],
      getIdeaById: (id) => get().ideas[id],
      hasDraft: () => !!get().draft,
    }),

    {
      name: 'knowledge-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist transient UI state
      partialize: (s) => ({
        ideas: s.ideas,
        folders: s.folders,
        edges: s.edges,
        draft: s.draft,
      }),
    }
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectFolderIds(
  folders: Record<string, Folder>,
  rootId: string
): Set<string> {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.pop()!;
    result.add(id);
    const folder = folders[id];
    if (folder) folder.childrenIds.forEach(c => queue.push(c));
  }
  return result;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── Colour map (folder colour key → hex used in graph) ──────────────────────

export const FOLDER_COLORS: Record<FolderColor, string> = {
  orange: '#EC5B13',
  blue:   '#378ADD',
  green:  '#639922',
  purple: '#7F77DD',
  pink:   '#D4537E',
  teal:   '#1D9E75',
  amber:  '#BA7517',
  red:    '#E24B4A',
};
