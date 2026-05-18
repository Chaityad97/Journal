import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

// ENTITIES
interface Idea {
  id: string;
  content: string;
  source?: string;
  folderId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  childrenIds: string[];
  createdAt: Date;
}

interface Draft {
  content: string;
  source?: string;
  folderId: string;
  tags: string[];
  updatedAt: Date;
}

// GLOBAL STORE STRUCTURE
interface IdeaStoreState {
  ideas: Record<string, Idea>;
  folders: Record<string, Folder>;
  rootFolderIds: string[];
  draft: Draft | null;
  selectedFolderId: string | null;
  searchQuery: string;
  ui: {
    isSidebarOpen: boolean;
  };
}

interface IdeaStoreContextType {
  // STATE
  state: IdeaStoreState;
  
  // DERIVED STATE GETTERS
  getFilteredIdeas: () => Idea[];
  getFolderTree: () => Folder[];
  getIdeasInFolder: (folderId: string) => Idea[];
  hasDraft: boolean;
  
  // IDEA ACTIONS
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIdea: (id: string, updates: Partial<Idea>) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  
  // FOLDER ACTIONS
  createFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'childrenIds'>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveFolder: (folderId: string, newParentId: string | null) => Promise<void>;
  
  // DRAFT ACTIONS
  saveDraft: (draft: Omit<Draft, 'updatedAt'>) => Promise<void>;
  restoreDraft: () => Draft | null;
  clearDraft: () => Promise<void>;
  
  // SEARCH & NAVIGATION ACTIONS
  setSearchQuery: (query: string) => void;
  selectFolder: (folderId: string | null) => void;
  clearFolderSelection: () => void;
  toggleSidebar: () => void;
}

const IdeaStoreContext = createContext<IdeaStoreContextType | undefined>(undefined);

export const useIdeaStore = () => {
  const context = useContext(IdeaStoreContext);
  if (!context) {
    throw new Error('useIdeaStore must be used within an IdeaStoreProvider');
  }
  return context;
};

interface IdeaStoreProviderProps {
  children: ReactNode;
}

export const IdeaStoreProvider: React.FC<IdeaStoreProviderProps> = ({ children }) => {
  const [state, setState] = useState<IdeaStoreState>({
    ideas: {},
    folders: {},
    rootFolderIds: [],
    draft: null,
    selectedFolderId: null,
    searchQuery: '',
    ui: {
      isSidebarOpen: false,
    },
  });

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load ideas
        const savedIdeas = await storage.getItem('ideas');
        const ideasRecord: Record<string, Idea> = {};
        if (savedIdeas) {
          const ideasData = JSON.parse(savedIdeas);
          ideasData.forEach((idea: any) => {
            ideasRecord[idea.id] = {
              ...idea,
              createdAt: new Date(idea.createdAt),
              updatedAt: new Date(idea.updatedAt)
            };
          });
        }

        // Load folders
        const savedFolders = await storage.getItem('folders');
        const foldersRecord: Record<string, Folder> = {};
        const rootIds: string[] = [];
        
        if (savedFolders) {
          const foldersData = JSON.parse(savedFolders);
          foldersData.forEach((folder: any) => {
            foldersRecord[folder.id] = {
              ...folder,
              createdAt: new Date(folder.createdAt),
              childrenIds: folder.childrenIds || []
            };
            if (!folder.parentId) {
              rootIds.push(folder.id);
            }
          });
        } else {
          // Initialize with default folders
          const defaultFolders = [
            { id: 'uncategorized', name: 'Uncategorized', parentId: null, childrenIds: [] },
            { id: '1', name: 'Philosophy', parentId: null, childrenIds: ['5'] },
            { id: '2', name: 'Science', parentId: null, childrenIds: ['6'] },
            { id: '3', name: 'Literature', parentId: null, childrenIds: [] },
            { id: '4', name: 'History', parentId: null, childrenIds: [] },
            { id: '5', name: 'Psychology', parentId: '1', childrenIds: [] },
            { id: '6', name: 'Physics', parentId: '2', childrenIds: [] },
          ];
          
          defaultFolders.forEach(folder => {
            foldersRecord[folder.id] = {
              ...folder,
              createdAt: new Date()
            };
            if (!folder.parentId) {
              rootIds.push(folder.id);
            }
          });
          
          await storage.setItem('folders', JSON.stringify(defaultFolders));
        }

        // Load draft
        let draft: Draft | null = null;
        const savedDraft = await storage.getItem('ideaDraft');
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft);
          draft = {
            content: draftData.content || '',
            source: draftData.source,
            folderId: draftData.folderId || 'uncategorized',
            tags: draftData.tags || [],
            updatedAt: new Date(draftData.updatedAt)
          };
        }

        setState({
          ideas: ideasRecord,
          folders: foldersRecord,
          rootFolderIds: rootIds,
          draft,
          selectedFolderId: null,
          searchQuery: '',
          ui: { isSidebarOpen: false }
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, []);

  // DERIVED STATE GETTERS
  const getFilteredIdeas = useMemo(() => (): Idea[] => {
    const ideasArray = Object.values(state.ideas);
    
    // Rule 3: Search overrides folder
    if (state.searchQuery) {
      return ideasArray.filter(idea => 
        idea.content.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        idea.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()))
      );
    }
    
    // Rule 2: Folder = filter
    if (state.selectedFolderId) {
      return getIdeasInFolder(state.selectedFolderId);
    }
    
    // Default: all ideas
    return ideasArray.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [state.ideas, state.selectedFolderId, state.searchQuery]);

  const getFolderTree = useMemo(() => (): Folder[] => {
    return state.rootFolderIds.map(id => state.folders[id]).filter(Boolean);
  }, [state.folders, state.rootFolderIds]);

  const getIdeasInFolder = useMemo(() => (folderId: string): Idea[] => {
    // Get ideas in folder + all subfolders (recursive)
    const folderIds = [folderId];
    const collectChildren = (parentId: string) => {
      const parent = state.folders[parentId];
      if (parent) {
        parent.childrenIds.forEach(childId => {
          folderIds.push(childId);
          collectChildren(childId);
        });
      }
    };
    collectChildren(folderId);
    
    return Object.values(state.ideas)
      .filter(idea => folderIds.includes(idea.folderId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [state.ideas, state.folders]);

  const hasDraft = !!state.draft;

  // IDEA ACTIONS
  const addIdea = async (ideaData: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const newIdea: Idea = {
      ...ideaData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };
    
    setState(prev => {
      const updatedIdeas = { ...prev.ideas, [newIdea.id]: newIdea };
      storage.setItem('ideas', JSON.stringify(Object.values(updatedIdeas)));
      return { ...prev, ideas: updatedIdeas, draft: null };
    });
    
    await clearDraft();
  };

  const updateIdea = async (id: string, updates: Partial<Idea>) => {
    setState(prev => {
      const idea = prev.ideas[id];
      if (!idea) return prev;
      
      const updatedIdea = { ...idea, ...updates, updatedAt: new Date() };
      const updatedIdeas = { ...prev.ideas, [id]: updatedIdea };
      storage.setItem('ideas', JSON.stringify(Object.values(updatedIdeas)));
      return { ...prev, ideas: updatedIdeas };
    });
  };

  const deleteIdea = async (id: string) => {
    setState(prev => {
      const updatedIdeas = { ...prev.ideas };
      delete updatedIdeas[id];
      storage.setItem('ideas', JSON.stringify(Object.values(updatedIdeas)));
      return { ...prev, ideas: updatedIdeas };
    });
  };

  // FOLDER ACTIONS
  const createFolder = async (folderData: Omit<Folder, 'id' | 'createdAt' | 'childrenIds'>) => {
    const now = new Date();
    const newFolder: Folder = {
      ...folderData,
      id: Date.now().toString(),
      childrenIds: [],
      createdAt: now,
    };
    
    setState(prev => {
      const updatedFolders = { ...prev.folders, [newFolder.id]: newFolder };
      
      // Update parent's childrenIds if there's a parent
      if (newFolder.parentId) {
        const parent = updatedFolders[newFolder.parentId];
        if (parent) {
          updatedFolders[newFolder.parentId] = {
            ...parent,
            childrenIds: [...parent.childrenIds, newFolder.id]
          };
        }
      }
      
      // Update rootFolderIds if it's a root folder
      const updatedRootIds = newFolder.parentId 
        ? prev.rootFolderIds 
        : [...prev.rootFolderIds, newFolder.id];
      
      storage.setItem('folders', JSON.stringify(Object.values(updatedFolders)));
      return { 
        ...prev, 
        folders: updatedFolders, 
        rootFolderIds: updatedRootIds 
      };
    });
  };

  const deleteFolder = async (folderId: string) => {
    setState(prev => {
      const folder = prev.folders[folderId];
      if (!folder) return prev;
      
      const updatedFolders = { ...prev.folders };
      delete updatedFolders[folderId];
      
      // Remove from parent's childrenIds
      if (folder.parentId) {
        const parent = updatedFolders[folder.parentId];
        if (parent) {
          updatedFolders[folder.parentId] = {
            ...parent,
            childrenIds: parent.childrenIds.filter(id => id !== folderId)
          };
        }
      }
      
      // Remove from rootFolderIds if it's a root folder
      const updatedRootIds = prev.rootFolderIds.filter(id => id !== folderId);
      
      // Move ideas to uncategorized
      const updatedIdeas = { ...prev.ideas };
      Object.values(updatedIdeas).forEach(idea => {
        if (idea.folderId === folderId) {
          updatedIdeas[idea.id] = { ...idea, folderId: 'uncategorized' };
        }
      });
      
      storage.setItem('folders', JSON.stringify(Object.values(updatedFolders)));
      storage.setItem('ideas', JSON.stringify(Object.values(updatedIdeas)));
      
      return { 
        ...prev, 
        folders: updatedFolders, 
        rootFolderIds: updatedRootIds,
        ideas: updatedIdeas
      };
    });
  };

  const moveFolder = async (folderId: string, newParentId: string | null) => {
    setState(prev => {
      const folder = prev.folders[folderId];
      if (!folder) return prev;
      
      const updatedFolders = { ...prev.folders };
      
      // Remove from old parent
      if (folder.parentId) {
        const oldParent = updatedFolders[folder.parentId];
        if (oldParent) {
          updatedFolders[folder.parentId] = {
            ...oldParent,
            childrenIds: oldParent.childrenIds.filter(id => id !== folderId)
          };
        }
      }
      
      // Add to new parent
      if (newParentId) {
        const newParent = updatedFolders[newParentId];
        if (newParent) {
          updatedFolders[newParentId] = {
            ...newParent,
            childrenIds: [...newParent.childrenIds, folderId]
          };
        }
      }
      
      // Update folder
      updatedFolders[folderId] = { ...folder, parentId: newParentId };
      
      // Update rootFolderIds
      const updatedRootIds = newParentId 
        ? prev.rootFolderIds.filter(id => id !== folderId)
        : [...prev.rootFolderIds, folderId];
      
      storage.setItem('folders', JSON.stringify(Object.values(updatedFolders)));
      return { 
        ...prev, 
        folders: updatedFolders, 
        rootFolderIds: updatedRootIds 
      };
    });
  };

  // DRAFT ACTIONS
  const saveDraft = async (draftData: Omit<Draft, 'updatedAt'>) => {
    const draft: Draft = {
      ...draftData,
      updatedAt: new Date(),
    };
    
    setState(prev => ({ ...prev, draft }));
    
    try {
      await storage.setItem('ideaDraft', JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const restoreDraft = (): Draft | null => {
    return state.draft;
  };

  const clearDraft = async () => {
    setState(prev => ({ ...prev, draft: null }));
    
    try {
      await storage.removeItem('ideaDraft');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  // SEARCH & NAVIGATION ACTIONS
  const setSearchQuery = (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  };

  const selectFolder = (folderId: string | null) => {
    setState(prev => ({ ...prev, selectedFolderId: folderId }));
  };

  const clearFolderSelection = () => {
    setState(prev => ({ ...prev, selectedFolderId: null }));
  };

  const toggleSidebar = () => {
    setState(prev => ({ 
      ...prev, 
      ui: { ...prev.ui, isSidebarOpen: !prev.ui.isSidebarOpen } 
    }));
  };

  const value: IdeaStoreContextType = {
    state,
    getFilteredIdeas,
    getFolderTree,
    getIdeasInFolder,
    hasDraft,
    addIdea,
    updateIdea,
    deleteIdea,
    createFolder,
    deleteFolder,
    moveFolder,
    saveDraft,
    restoreDraft,
    clearDraft,
    setSearchQuery,
    selectFolder,
    clearFolderSelection,
    toggleSidebar,
  };

  return (
    <IdeaStoreContext.Provider value={value}>
      {children}
    </IdeaStoreContext.Provider>
  );
};
