import React, { useRef } from 'react';
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { FOLDER_COLORS, Idea, useAppStore } from '../store/useAppStore';

interface Props {
  idea: Idea;
  onPress?: () => void;
  onDelete?: () => void;
}

export default function IdeaCard({ idea, onPress, onDelete }: Props) {
  const { getFolderById } = useAppStore();
  const folder = getFolderById(idea.folderId);
  const folderColor = folder ? FOLDER_COLORS[folder.colorKey] : '#EC5B13';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLongPress = () => {
    Alert.alert(
      'Idea options',
      idea.content.slice(0, 60) + (idea.content.length > 60 ? '…' : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={[styles.card, { borderLeftColor: folderColor }]}>

          {/* Tags */}
          {idea.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {idea.tags.slice(0, 3).map((tag: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {idea.tags.length > 3 && (
                <Text style={styles.moreTagsText}>+{idea.tags.length - 3}</Text>
              )}
            </View>
          )}

          {/* Title */}
          {idea.title && (
            <Text style={styles.title} numberOfLines={2}>
              {idea.title}
            </Text>
          )}

          {/* Content */}
          <Text style={styles.content} numberOfLines={4}>
            {idea.content}
          </Text>

          {/* Source row */}
          {idea.source ? (
            <View style={styles.sourceRow}>
              <View style={[styles.sourceIcon, { backgroundColor: folderColor + '22' }]}>
                <Text style={[styles.sourceIconText, { color: folderColor }]}>
                  {idea.source.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.sourceText} numberOfLines={1}>
                {idea.source}
              </Text>
            </View>
          ) : null}

          {/* Footer */}
          <View style={styles.footer}>
            {/* Folder label */}
            {folder && (
              <View style={[styles.folderPill, { backgroundColor: folderColor + '18' }]}>
                <View style={[styles.folderDot, { backgroundColor: folderColor }]} />
                <Text style={[styles.folderPillText, { color: folderColor }]}>
                  {folder.name}
                </Text>
              </View>
            )}

            {/* Connection count */}
            {idea.connections.length > 0 && (
              <View style={styles.connectionsBadge}>
                <Text style={styles.connectionsText}>
                  {idea.connections.length} link{idea.connections.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    gap: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#262626',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moreTagsText: {
    fontSize: 11,
    color: '#64748B',
    paddingVertical: 3,
  },
  title: {
    fontSize: 18,
    color: '#F1F5F9',
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    color: '#F1F5F9',
    lineHeight: 22,
    fontWeight: '400',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceIconText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sourceText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  folderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  folderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  folderPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectionsBadge: {
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectionsText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
