import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FolderModal from '../../components/FolderModal';
import IdeaCard from '../../components/IdeaCard';
import { FOLDER_COLORS, useAppStore } from '../../store/useAppStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [showFolderModal, setShowFolderModal] = useState(false);
  const {
    getFilteredIdeas,
    getFolderTree,
    searchQuery,
    setSearchQuery,
    selectedFolderId,
    selectFolderSingle,
    deleteIdea,
    deleteFolder,
  } = useAppStore();

  const ideas = getFilteredIdeas();
  const folders = getFolderTree();

  const handleDelete = useCallback((id: string) => {
    deleteIdea(id);
  }, []);

  const handleDeleteFolder = useCallback((folderId: string, folderName: string) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folderName}"? This will also delete ALL ideas in this folder and their connections.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFolder(folderId);
            if (selectedFolderId === folderId) {
              selectFolderSingle(null);
            }
          },
        },
      ]
    );
  }, [deleteFolder, selectedFolderId, selectFolderSingle]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ideas</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search ideas…"
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Folder filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              !selectedFolderId && styles.chipActive,
            ]}
            onPress={() => selectFolderSingle(null)}
          >
            <Text style={[styles.chipText, !selectedFolderId && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {folders.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.chip,
                selectedFolderId === f.id && {
                  backgroundColor: FOLDER_COLORS[f.colorKey],
                },
              ]}
              onPress={() => selectFolderSingle(selectedFolderId === f.id ? null : f.id)}
              onLongPress={() => handleDeleteFolder(f.id, f.name)}
            >
              <Text style={[
                styles.chipText,
                selectedFolderId === f.id && styles.chipTextActive,
              ]}>
                {f.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addFolderChip}
            onPress={() => setShowFolderModal(true)}
          >
            <Text style={styles.addFolderChipText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Scrollable Feed Section */}
      <View style={styles.feedContainer}>
        {ideas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No ideas yet</Text>
            <Text style={styles.emptySubtitle}>
              Start capturing ideas to build your knowledge graph
            </Text>
          </View>
        ) : (
          <FlatList
            data={ideas}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <IdeaCard
                idea={item}
                onDelete={() => handleDelete(item.id)}
                onPress={() => router.push(`/idea/${item.id}`)}
              />
            )}
            contentContainerStyle={[
              styles.feed,
              { paddingBottom: insets.bottom + 100 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom - 25 }]}
        onPress={() => router.push('/create-idea')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Folder Modal */}
      <FolderModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  fixedHeader: {
    backgroundColor: '#0F0F0F',
    zIndex: 1,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchRow: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: '#64748B',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: '#F9FAFB',
  },
  clearBtn: {
    fontSize: 13,
    color: '#64748B',
    padding: 4,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 12,
    minHeight: 56,
  },
  chip: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    maxWidth: 120,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  chipActive: {
    backgroundColor: '#EC5B13',
  },
  chipText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  feed: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyBtn: {
    backgroundColor: '#EC5B13',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    left: '50%',
    marginLeft: -35,
    backgroundColor: '#EC5B13',
    borderRadius: 35,
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 40,
    lineHeight: 40,
  },
  addFolderChip: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 60,
    maxWidth: 120,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  addFolderChipText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
  },
  chipRemoveIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: 'bold',
  },
});
