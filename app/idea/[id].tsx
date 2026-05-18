import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOLDER_COLORS, useAppStore } from '../../store/useAppStore';

export default function IdeaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    getIdeaById,
    getFolderById,
    deleteIdea,
    disconnectIdeas,
    updateIdea,
    ideas,
  } = useAppStore();

  const idea = getIdeaById(id);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(idea?.title || '');
  const [editContent, setEditContent] = useState(idea?.content || '');
  const [editSource, setEditSource] = useState(idea?.source || '');

  if (!idea) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Idea not found</Text>
        </View>
      </View>
    );
  }

  const folder = getFolderById(idea.folderId);
  const folderColor = folder ? FOLDER_COLORS[folder.colorKey] : '#EC5B13';
  const connectedIdeas = idea.connections
    .map(cid => getIdeaById(cid))
    .filter(Boolean);

  const handleDelete = () => {
    Alert.alert('Delete idea?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteIdea(id);
          router.back();
        },
      },
    ]);
  };

  const handleSave = () => {
    if (isEditing) {
      updateIdea(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        source: editSource.trim(),
      });
      setIsEditing(false);
    } else {
      Alert.alert('Delete idea?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteIdea(id);
            router.back();
          },
        },
      ]);
    }
  };

  const handleDisconnect = (otherId: string) => {
    Alert.alert('Remove connection?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => disconnectIdeas(id, otherId),
      },
    ]);
  };

  const formattedDate = new Date(idea.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.graphBtn}
            onPress={() => {
              router.push('/(tabs)/graph');
            }}
          >
            <Text style={styles.graphBtnText}>Graph</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              if (isEditing) {
                handleSave();
              } else {
                setIsEditing(true);
              }
            }}
          >
            <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Folder badge */}
        {folder && (
          <View style={[styles.folderBadge, { backgroundColor: folderColor + '20' }]}>
            <View style={[styles.folderDot, { backgroundColor: folderColor }]} />
            <Text style={[styles.folderBadgeText, { color: folderColor }]}>
              {folder.name}
            </Text>
          </View>
        )}

        {/* Title */}
        {isEditing ? (
          <TextInput
            style={styles.editTitle}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Title"
            placeholderTextColor="#64748B"
            multiline
          />
        ) : idea.title ? (
          <Text style={styles.ideaTitle}>{idea.title}</Text>
        ) : null}

        {/* Main content */}
        {isEditing ? (
          <TextInput
            style={styles.editContent}
            value={editContent}
            onChangeText={setEditContent}
            placeholder="Core idea"
            placeholderTextColor="#64748B"
            multiline
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.ideaContent}>{idea.content}</Text>
        )}

        {/* Source */}
        {idea.source ? (
          <Text style={styles.source}>— {idea.source}</Text>
        ) : null}

        {/* Meta */}
        <Text style={styles.date}>{formattedDate}</Text>

        {/* Tags */}
        {idea.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Themes</Text>
            <View style={styles.tagsRow}>
              {idea.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Connections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Connections ({connectedIdeas.length})
          </Text>
          {connectedIdeas.length === 0 ? (
            <Text style={styles.noConnections}>
              No connections yet. Use the Graph screen to connect ideas.
            </Text>
          ) : (
            <View style={styles.connectionsList}>
              {connectedIdeas.map(ci => {
                if (!ci) return null;
                const cFolder = getFolderById(ci.folderId);
                const cColor = cFolder ? FOLDER_COLORS[cFolder.colorKey] : '#EC5B13';
                return (
                  <View key={ci.id} style={styles.connectionCard}>
                    <View style={[styles.connectionBar, { backgroundColor: cColor }]} />
                    <View style={styles.connectionBody}>
                      <Text style={styles.connectionContent} numberOfLines={2}>
                        {ci.content}
                      </Text>
                      {ci.source ? (
                        <Text style={styles.connectionSource}>{ci.source}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      style={styles.disconnectBtn}
                      onPress={() => handleDisconnect(ci.id)}
                    >
                      <Text style={styles.disconnectText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 22,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  graphBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  graphBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtn: {
    backgroundColor: '#EC5B13',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deleteBtnText: {
    fontSize: 13,
    color: '#E24B4A',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  folderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 16,
  },
  folderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  folderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ideaTitle: {
    fontSize: 22,
    color: '#F9FAFB',
    lineHeight: 28,
    fontWeight: '600',
    marginBottom: 6,
  },
  ideaContent: {
    fontSize: 16,
    color: '#F9FAFB',
    lineHeight: 24,
    fontWeight: '400',
    marginBottom: 8,
  },
  editTitle: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 22,
    color: '#F9FAFB',
    marginBottom: 8,
  },
  editContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#F9FAFB',
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  source: {
    fontSize: 15,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  tagText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  noConnections: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  connectionsList: {
    gap: 10,
  },
  connectionCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  connectionBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  connectionBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  connectionContent: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  connectionSource: {
    fontSize: 12,
    color: '#64748B',
  },
  disconnectBtn: {
    padding: 14,
  },
  disconnectText: {
    fontSize: 13,
    color: '#374151',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
  },
});
