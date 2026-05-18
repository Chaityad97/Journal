import React, { useState } from 'react';
import { View, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { useKnowledgeStore } from '@/hooks/useKnowledgeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';

export default function AddNodeScreen() {
  const { addNode } = useKnowledgeStore();
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter a main idea');
      return;
    }

    if (!source.trim()) {
      Alert.alert('Error', 'Please enter a source');
      return;
    }

    setIsSubmitting(true);

    try {
      const nodeId = Date.now().toString();
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      addNode({
        id: nodeId,
        text: text.trim(),
        source: source.trim(),
        tags: tagsArray,
      });

      Alert.alert('Success', 'Node added successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add node');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.formCard}>
        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Main idea"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Source (book/article)"
            value={source}
            onChangeText={setSource}
          />
        </View>

        <View style={styles.fieldContainer}>
          <TextInput
            style={styles.input}
            placeholder="Tags (comma separated)"
            value={tags}
            onChangeText={setTags}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isSubmitting ? 'Adding...' : 'Add Node'}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
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
  formCard: {
    margin: 16,
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  buttonContainer: {
    marginTop: 12,
  },
});
