import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FolderModal from '../components/FolderModal';
import { FOLDER_COLORS, useAppStore } from '../store/useAppStore';

export default function CreateIdeaScreen() {
  const insets = useSafeAreaInsets();
  const {
    addIdea,
    saveDraft,
    clearDraft,
    hasDraft,
    draft,
    getFolderTree,
    folders,
    deleteFolder,
  } = useAppStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('uncategorized');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [draftSavedVisible, setDraftSavedVisible] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteFolder = (folderId: string, folderName: string) => {
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
              setSelectedFolderId('uncategorized');
            }
          },
        },
      ]
    );
  };

  const rootFolders = getFolderTree();
  const allFolders = Object.values(folders).sort((a, b) => a.createdAt - b.createdAt);
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;

  // Restore draft on mount
  useEffect(() => {
    if (draft) {
      setTitle(draft.title);
      setContent(draft.content);
      setSource(draft.source ?? '');
      setSelectedFolderId(draft.folderId);
      setTags(draft.tags);
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (!title && !content && !source) return;
    autoSaveTimer.current = setTimeout(() => {
      saveDraft({ title, content, source, folderId: selectedFolderId, tags });
      setDraftSavedVisible(true);
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => setDraftSavedVisible(false), 2000);
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, source, selectedFolderId, tags]);

  const handleSave = () => {
    if (!content.trim()) {
      Alert.alert('Missing content', 'Please enter a core idea.');
      return;
    }
    if (!source.trim()) {
      Alert.alert('Missing source', 'Please enter a source.');
      return;
    }
    addIdea({ title: title.trim(), content: content.trim(), source: source.trim(), folderId: selectedFolderId, tags });
    clearDraft();
    router.back();
  };

  const handleCancel = () => {
    if (title.trim() || content.trim() || source.trim()) {
      Alert.alert('Discard?', 'Your draft will be saved automatically.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => { clearDraft(); router.back(); },
        },
      ]);
    } else {
      router.back();
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const canSave = content.trim().length > 0 && source.trim().length > 0;
  const selectedFolder = folders[selectedFolderId];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {draftSavedVisible ? (
            <Text style={styles.draftSaved}>Draft saved</Text>
          ) : 'Create Idea'}
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Give your idea a title"
            placeholderTextColor="#374151"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* ── Core idea ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Core Idea</Text>
          <TextInput
            style={styles.mainInput}
            multiline
            placeholder="What's the core idea?"
            placeholderTextColor="#374151"
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
            autoFocus
          />
          <Text style={styles.wordCount}>{wordCount} word{wordCount !== 1 ? 's' : ''}</Text>
        </View>

        {/* ── Source ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Source</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Meditations by Marcus Aurelius"
            placeholderTextColor="#374151"
            value={source}
            onChangeText={setSource}
          />
        </View>

        {/* ── Folder picker ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Folder</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.folderRow}
          >
            {allFolders.map(f => {
              const isSelected = f.id === selectedFolderId;
              const color = FOLDER_COLORS[f.colorKey];
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.folderChip,
                    isSelected && { backgroundColor: color + '22', borderColor: color },
                  ]}
                  onPress={() => setSelectedFolderId(f.id)}
                  onLongPress={() => handleDeleteFolder(f.id, f.name)}
                >
                  <View style={[styles.folderDot, { backgroundColor: color }]} />
                  <Text style={[
                    styles.folderChipText,
                    isSelected && { color },
                  ]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.addFolderChip}
              onPress={() => setShowFolderModal(true)}
            >
              <Text style={styles.addFolderChipText}>+</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Themes / tags ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Themes</Text>
          <View style={styles.tagsWrap}>
            {tags.map((tag, i) => (
              <TouchableOpacity
                key={i}
                style={styles.tag}
                onPress={() => setTags(t => t.filter((_, j) => j !== i))}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <Text style={styles.tagRemove}>×</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.tagInput}
              placeholder="Add theme…"
              placeholderTextColor="#374151"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              blurOnSubmit={false}
              returnKeyType="done"
            />
          </View>
        </View>
      </ScrollView>

      {/* Folder Modal */}
      <FolderModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  draftSaved: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 16,
    color: '#64748B',
  },
  saveBtn: {
    backgroundColor: '#EC5B13',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#1F2937',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  mainInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontWeight: '300',
    color: '#F9FAFB',
    lineHeight: 30,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#F9FAFB',
  },
  wordCount: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'right',
    marginTop: 6,
  },
  folderRow: {
    gap: 8,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  folderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  folderChipText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  addFolderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    minWidth: 40,
  },
  addFolderChipText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  tagText: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  tagRemove: {
    fontSize: 15,
    color: '#64748B',
  },
  tagInput: {
    minWidth: 120,
    fontSize: 14,
    color: '#F9FAFB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
});
