import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export default function Sidebar() {
  const { getFolderTree, getIdeasInFolder, createFolder } = useAppStore();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(null);

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    await createFolder({
      name: newFolderName.trim(),
      parentId: selectedParentId,
    });

    setNewFolderName('');
    setSelectedParentId(null);
    setShowCreateFolder(false);
  };

  const renderFolderTree = (folders, parentId = null, level = 0) => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => {
        const childFolders = renderFolderTree(folders, folder.id, level + 1);
        const folderIdeas = getIdeasInFolder(folder.id);
        const isExpanded = expandedFolders.has(folder.id);

        return (
          <View key={folder.id} style={[styles.folderContainer, { marginLeft: level * 16 }]}>
            <TouchableOpacity
              style={styles.folderHeader}
              onPress={() => toggleFolder(folder.id)}
            >
              <Text style={styles.folderIcon}>
                {isExpanded ? 'folder_open' : 'folder'}
              </Text>
              <Text style={styles.folderName}>{folder.name}</Text>
              <Text style={styles.ideaCount}>({folderIdeas.length})</Text>
            </TouchableOpacity>
            
            {isExpanded && (
              <View style={styles.folderContent}>
                {folderIdeas.map(idea => (
                  <View key={idea.id} style={styles.ideaItem}>
                    <Text style={styles.ideaContent} numberOfLines={2}>
                      {idea.content}
                    </Text>
                    <Text style={styles.ideaMeta}>
                      {new Date(idea.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
                {childFolders}
              </View>
            )}
          </View>
        );
      });
  };

  const allFolders = getFolderTree();
  const uncategorizedIdeas = getIdeasInFolder('uncategorized');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge Base</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateFolder(true)}
        >
          <Text style={styles.createButtonIcon}>add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Uncategorized folder */}
        <View style={styles.folderContainer}>
          <TouchableOpacity
            style={styles.folderHeader}
            onPress={() => toggleFolder('uncategorized')}
          >
            <Text style={styles.folderIcon}>
              {expandedFolders.has('uncategorized') ? 'folder_open' : 'folder'}
            </Text>
            <Text style={styles.folderName}>Uncategorized</Text>
            <Text style={styles.ideaCount}>
              ({uncategorizedIdeas.length})
            </Text>
          </TouchableOpacity>
          
          {expandedFolders.has('uncategorized') && (
            <View style={styles.folderContent}>
              {uncategorizedIdeas.map(idea => (
                <View key={idea.id} style={styles.ideaItem}>
                  <Text style={styles.ideaContent} numberOfLines={2}>
                    {idea.content}
                  </Text>
                  <Text style={styles.ideaMeta}>
                    {new Date(idea.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Folder tree */}
        {renderFolderTree(allFolders)}
      </ScrollView>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Folder name"
              value={newFolderName}
              onChangeText={setNewFolderName}
            />

            <View style={styles.parentSelector}>
              <Text style={styles.label}>Parent Folder (optional):</Text>
              <TouchableOpacity
                style={styles.parentButton}
                onPress={() => {
                  // Show folder picker logic here
                  Alert.alert('Info', 'Parent folder selection coming soon');
                }}
              >
                <Text style={styles.parentButtonText}>
                  {selectedParentId 
                    ? folders.find(f => f.id === selectedParentId)?.name || 'Select Parent'
                    : 'No Parent'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                  setSelectedParentId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleCreateFolder}
              >
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRightWidth: 1,
    borderRightColor: '#2D2D2D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EC5B13',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 18,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 8,
  },
  folderContainer: {
    marginBottom: 4,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  folderIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#94A3B8',
    marginRight: 8,
  },
  folderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
  },
  ideaCount: {
    fontSize: 12,
    color: '#64748B',
  },
  folderContent: {
    paddingLeft: 28,
    paddingRight: 12,
    paddingBottom: 8,
  },
  ideaItem: {
    backgroundColor: '#121212',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  ideaContent: {
    fontSize: 12,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  ideaMeta: {
    fontSize: 10,
    color: '#64748B',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  parentSelector: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  parentButton: {
    backgroundColor: '#121212',
    borderRadius: 8,
    padding: 12,
  },
  parentButtonText: {
    color: '#F1F5F9',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#94A3B8',
  },
  confirmButton: {
    backgroundColor: '#EC5B13',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
