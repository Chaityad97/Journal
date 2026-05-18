import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function IdeaCard({ idea }) {
  return (
    <View style={styles.card}>
      {/* Tags */}
      {idea.tags && idea.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {idea.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      <Text style={styles.content}>{idea.content}</Text>

      {/* Source */}
      <View style={styles.sourceContainer}>
        <View style={styles.sourceIcon}>
          <Text style={styles.sourceIconText}>menu_book</Text>
        </View>
        <Text style={styles.sourceText}>{idea.source || 'No source'}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>bookmark_border</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>ios_share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>more_vert</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EC5B13',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  content: {
    fontSize: 16,
    fontWeight: '400',
    color: '#F9FAFB',
    lineHeight: 24,
    marginBottom: 16,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sourceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceIconText: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 14,
    color: '#9CA3AF',
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  actionIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#64748B',
  },
});
