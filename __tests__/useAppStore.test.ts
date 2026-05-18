import { useAppStore } from '../store/useAppStore';

const initialState = useAppStore.getState();

function resetStore() {
  useAppStore.setState(
    {
      ...initialState,
      ideas: {},
      folders: JSON.parse(JSON.stringify(initialState.folders)),
      edges: [],
      draft: null,
      selectedNodeId: null,
      selectedFolderId: null,
      selectedFolderIds: [],
      searchQuery: '',
      aiSearchResults: null,
      aiInsights: null,
      isAILoading: false,
      aiError: null,
    },
    true
  );
}

describe('useAppStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('adds and updates an idea', () => {
    const id = useAppStore.getState().addIdea({
      title: 'Test Idea',
      content: 'Testing Zustand store',
      source: 'Unit Test',
      folderId: 'uncategorized',
      tags: ['test'],
    });

    let savedIdea = useAppStore.getState().ideas[id];
    expect(savedIdea.title).toBe('Test Idea');
    expect(savedIdea.content).toBe('Testing Zustand store');

    useAppStore.getState().updateIdea(id, { title: 'Updated Idea' });

    savedIdea = useAppStore.getState().ideas[id];
    expect(savedIdea.title).toBe('Updated Idea');
  });

  it('connects and disconnects ideas', () => {
    const firstId = useAppStore.getState().addIdea({
      title: 'First',
      content: 'First node',
      source: 'Source A',
      folderId: 'uncategorized',
      tags: [],
    });

    const secondId = useAppStore.getState().addIdea({
      title: 'Second',
      content: 'Second node',
      source: 'Source B',
      folderId: 'uncategorized',
      tags: [],
    });

    useAppStore.getState().connectIdeas(firstId, secondId);

    expect(useAppStore.getState().ideas[firstId].connections).toContain(secondId);
    expect(useAppStore.getState().ideas[secondId].connections).toContain(firstId);
    expect(useAppStore.getState().edges).toHaveLength(1);

    useAppStore.getState().disconnectIdeas(firstId, secondId);

    expect(useAppStore.getState().ideas[firstId].connections).not.toContain(secondId);
    expect(useAppStore.getState().ideas[secondId].connections).not.toContain(firstId);
    expect(useAppStore.getState().edges).toHaveLength(0);
  });

  it('saves and clears a draft', () => {
    useAppStore.getState().saveDraft({
      title: 'Draft title',
      content: 'Draft content',
      source: 'Draft source',
      folderId: 'uncategorized',
      tags: ['draft'],
    });

    expect(useAppStore.getState().draft?.title).toBe('Draft title');
    expect(useAppStore.getState().hasDraft()).toBe(true);

    useAppStore.getState().clearDraft();

    expect(useAppStore.getState().draft).toBeNull();
    expect(useAppStore.getState().hasDraft()).toBe(false);
  });

  it('updates shared UI state for folder and search selection', () => {
    useAppStore.getState().selectFolderSingle('f-science');
    expect(useAppStore.getState().selectedFolderId).toBe('f-science');

    useAppStore.getState().setSearchQuery('search behavior');
    expect(useAppStore.getState().searchQuery).toBe('search behavior');

    useAppStore.getState().selectFolderMulti('f-science');
    expect(useAppStore.getState().selectedFolderIds).toContain('f-science');

    useAppStore.getState().selectFolderMulti('f-science');
    expect(useAppStore.getState().selectedFolderIds).not.toContain('f-science');
  });
});
