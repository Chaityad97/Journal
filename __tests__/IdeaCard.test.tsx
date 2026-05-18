import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import IdeaCard from '../components/IdeaCard';
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

describe('IdeaCard', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders idea content and fires onPress', () => {
    const onPress = jest.fn();

    const { getByText } = render(
      <IdeaCard
        idea={{
          id: 'idea-1',
          title: 'Sample title',
          content: 'Sample content for testing',
          source: 'Test source',
          folderId: 'uncategorized',
          tags: ['react'],
          connections: [],
          createdAt: 1,
          updatedAt: 1,
        }}
        onPress={onPress}
      />
    );

    fireEvent.press(getByText('Sample content for testing'));
    expect(onPress).toHaveBeenCalled();
    expect(getByText('Test source')).toBeTruthy();
    expect(getByText('Sample content for testing')).toBeTruthy();
  });
});
