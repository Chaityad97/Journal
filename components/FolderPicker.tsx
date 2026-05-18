import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';

interface FolderPickerProps {
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
}

export default function FolderPicker({ selectedFolderId, onFolderSelect }: FolderPickerProps) {
  const { createFolder } = useAppStore();
  const { folders } = useAppStore();
  const folderList = Object.values(folders);

  const handleCreateFolder = () => {
    Alert.prompt(
      'New Folder',
      'Enter folder name:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: (name?: string) => {
            if (name && name.trim()) {
              createFolder({
                name: name.trim(),
                parentId: null,
                colorKey: 'orange'
              });
            }
          }
        }
      ],
      'plain-text'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Folder</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateFolder}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.folderList}>
        <TouchableOpacity
          style={[
            styles.folderItem,
            selectedFolderId === 'uncategorized' && styles.selectedFolder
          ]}
          onPress={() => onFolderSelect('uncategorized')}
        >
          <Text style={styles.folderIcon}>folder</Text>
          <Text style={styles.folderName}>Uncategorized</Text>
        </TouchableOpacity>
        
        {folders.map(folder => (
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.folderItem,
              selectedFolderId === folder.id && styles.selectedFolder
            ]}
            onPress={() => onFolderSelect(folder.id)}
          >
            <Text style={styles.folderIcon}>folder</Text>
            <Text style={styles.folderName}>{folder.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  createButton: {
    backgroundColor: '#EC5B13',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  folderList: {
    gap: 4,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  selectedFolder: {
    borderColor: '#EC5B13',
    backgroundColor: 'rgba(236, 91, 19, 0.1)',
  },
  folderIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#64748B',
    marginRight: 12,
  },
  folderName: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '500',
  },
});
