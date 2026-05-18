import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';

export default function ProfileScreen() {
  const { ideas, folders } = useAppStore();
  
  const totalIdeas = Object.keys(ideas).length;
  const totalFolders = Object.keys(folders).length;
  const totalTags = Object.values(ideas).reduce((acc, idea) => {
    const ideaTags = idea.tags || [];
    return acc + ideaTags.length;
  }, 0);

  const recentIdeas = Object.values(ideas)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <Ionicons name="stats-chart" size={48} color="#64748B" />
      <Text style={styles.title}>Profile</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalIdeas}</Text>
          <Text style={styles.statLabel}>Total Ideas</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalFolders}</Text>
          <Text style={styles.statLabel}>Total Folders</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalTags}</Text>
          <Text style={styles.statLabel}>Total Tags</Text>
        </View>
      </View>

      <View style={styles.recentContainer}>
        <Text style={styles.recentTitle}>Recent Ideas</Text>
        {recentIdeas.map((idea, index) => (
          <View key={idea.id} style={styles.recentItem}>
            <Text style={styles.recentContent}>
              {idea.content.length > 50 
                ? idea.content.slice(0, 50) + '...'
                : idea.content
              }
            </Text>
            <Text style={styles.recentDate}>
              {new Date(idea.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#1F1F1F',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#EC5B13',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  recentContainer: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  recentItem: {
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  recentContent: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  recentDate: {
    fontSize: 12,
    color: '#64748B',
  },
});
