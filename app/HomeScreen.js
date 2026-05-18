import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import Header from '../components/Header';
import IdeaCard from '../components/IdeaCard';
import BottomNav from '../components/BottomNav';

const mockData = [
  {
    id: '1',
    ideaText: '"The unexamined life is not worth living."',
    source: 'Socrates',
    book: 'Plato\'s Apology',
    tags: ['PHILOSOPHY', 'ETHICS'],
    connections: 12,
  },
  {
    id: '2',
    ideaText: '"Man is condemned to be free; because once thrown into the world, he is responsible for everything he does."',
    source: 'Jean-Paul Sartre',
    book: 'Being and Nothingness',
    tags: ['EXISTENTIALISM', 'FREEDOM'],
    connections: 8,
  },
  {
    id: '3',
    ideaText: '"Reality is merely an illusion, albeit a very persistent one."',
    source: 'Albert Einstein',
    book: 'Relativity: The Special and General Theory',
    tags: ['SCIENCE', 'REALITY'],
    connections: 15,
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <Header />
        <FlatList
          data={mockData}
          renderItem={({ item }) => <IdeaCard idea={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mainContent: {
    flex: 1,
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 96, // Account for bottom nav
    gap: 24,
  },
});
