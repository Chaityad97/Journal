import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StyleSheet } from 'react-native';
import { ConceptNode } from '../types/knowledge';
import { Card } from './ui/Card';
import { Tag } from './ui/Tag';

interface NodeCardProps {
  node: ConceptNode;
  onPress: (node: ConceptNode) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(node)}>
      <Card>
        <View style={styles.container}>
          <Text style={styles.title} numberOfLines={2}>
            {node.text}
          </Text>
          <Text style={styles.source} numberOfLines={1}>
            {node.source}
          </Text>
          <View style={styles.tagsContainer}>
            {node.tags.map((tag, index) => (
              <Tag key={index} text={tag} />
            ))}
          </View>
          {node.connections.length > 0 && (
            <Text style={styles.connections}>
              {node.connections.length} connection{node.connections.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 22,
  },
  source: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  connections: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
  },
});
