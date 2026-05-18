import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useKnowledgeStore } from '@/hooks/useKnowledgeStore';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';

export default function NodeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { graph, getNodeConnections } = useKnowledgeStore();
  
  const node = graph.nodes.get(id);
  const connectedNodes = getNodeConnections(id);

  if (!node) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Node not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.mainCard}>
        <Text style={styles.title}>{node.text}</Text>
        <Text style={styles.source}>{node.source}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsContainer}>
            {node.tags.map((tag, index) => (
              <Tag key={index} text={tag} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Connections ({node.connections.length})
          </Text>
          {connectedNodes.length > 0 ? (
            connectedNodes.map((connectedNode) => (
              <Card key={connectedNode.id} style={styles.connectionCard}>
                <Text style={styles.connectionTitle}>{connectedNode.text}</Text>
                <Text style={styles.connectionSource}>{connectedNode.source}</Text>
              </Card>
            ))
          ) : (
            <Text style={styles.noConnections}>No connections yet</Text>
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainCard: {
    margin: 16,
    gap: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 28,
  },
  source: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  connectionCard: {
    marginBottom: 8,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  connectionSource: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  noConnections: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginTop: 50,
  },
});
