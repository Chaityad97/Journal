import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useIdeaStore } from '../store/IdeaStore';

export default function FolderPicker({ selectedFolderId, onFolderSelect }) {
  const { folders, createFolder } = useIdeaStore();
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

  const renderFolderTree = (parentId = null, level = 0) => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => {
        const childFolders = renderFolderTree(folder.id, level + 1);
        const isExpanded = expandedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;

        return (
          <View key={folder.id} style={[styles.folderContainer, { marginLeft: level * 16 }]}>
            <TouchableOpacity
              style={[
                styles.folderRow,
                isSelected && styles.selectedFolderRow
              ]}
              onPress={() => {
                onFolderSelect(folder.id);
              }}
            >
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleFolder(folder.id)}
              >
                <Text style={styles.expandIcon}>
                  {isExpanded ? 'expand_more' : 'chevron_right'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.folderIcon}>
                {isExpanded ? 'folder_open' : 'folder'}
              </Text>
              <Text style={[
                styles.folderName,
                isSelected && styles.selectedFolderName
              ]}>
                {folder.name}
              </Text>
            </TouchableOpacity>
            
            {isExpanded && childFolders}
          </View>
        );
      });
  };

  const getFolderPath = (folderId) => {
    const path = [];
    let currentFolder = folders.find(f => f.id === folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder.name);
      currentFolder = currentFolder.parentId 
        ? folders.find(f => f.id === currentFolder.parentId)
        : null;
    }
    
    return path.join(' / ');
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowCreateFolder(true)}
      >
        <View style={styles.selectedFolderInfo}>
          <Text style={styles.folderIcon}>folder</Text>
          <Text style={styles.selectedFolderText}>
            {selectedFolder ? getFolderPath(selectedFolderId) : 'Select Folder'}
          </Text>
        </View>
        <Text style={styles.dropdownIcon}>expand_more</Text>
      </TouchableOpacity>

      <Modal
        visible={showCreateFolder}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateFolder(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Folder</Text>
            <TouchableOpacity onPress={() => setShowCreateFolder(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.folderList}>
            {/* Uncategorized folder */}
            <TouchableOpacity
              style={[
                styles.folderRow,
                selectedFolderId === 'uncategorized' && styles.selectedFolderRow
              ]}
              onPress={() => {
                onFolderSelect('uncategorized');
              }}
            >
              <Text style={styles.folderIcon}>folder</Text>
              <Text style={[
                styles.folderName,
                selectedFolderId === 'uncategorized' && styles.selectedFolderName
              ]}>
                Uncategorized
              </Text>
            </TouchableOpacity>

            {/* Folder tree */}
            {renderFolderTree()}
          </ScrollView>

          <View style={styles.createSection}>
            <TouchableOpacity
              style={styles.createFolderButton}
              onPress={() => {
                // Show create folder dialog
                Alert.prompt(
                  'Create New Folder',
                  'Enter folder name:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Create', 
                      onPress: (name) => {
                        if (name && name.trim()) {
                          createFolder({
                            name: name.trim(),
                            parentId: selectedFolderId === 'uncategorized' ? null : selectedFolderId
                          });
                        }
                      }
                    }
                  ],
                  'plain-text'
                );
              }}
            >
              <Text style={styles.createFolderIcon}>add</Text>
              <Text style={styles.createFolderText}>Create New Folder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  selectedFolderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#94A3B8',
    marginRight: 8,
  },
  selectedFolderText: {
    fontSize: 14,
    color: '#F1F5F9',
    flex: 1,
  },
  dropdownIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#64748B',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  cancelText: {
    fontSize: 16,
    color: '#EC5B13',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  doneText: {
    fontSize: 16,
    color: '#EC5B13',
  },
  folderList: {
    flex: 1,
    padding: 16,
  },
  folderContainer: {
    marginBottom: 2,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  selectedFolderRow: {
    backgroundColor: 'rgba(236, 91, 19, 0.1)',
  },
  expandButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  expandIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 18,
    color: '#64748B',
  },
  folderName: {
    flex: 1,
    fontSize: 14,
    color: '#F1F5F9',
  },
  selectedFolderName: {
    color: '#EC5B13',
    fontWeight: '500',
  },
  createSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  createFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EC5B13',
  },
  createFolderIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#EC5B13',
    marginRight: 8,
  },
  createFolderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EC5B13',
  },
});
