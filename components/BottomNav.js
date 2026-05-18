import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const navTabs = [
  { id: 'feed', icon: '📄', label: 'Feed', active: true },
  { id: 'graph', icon: '🔗', label: 'Graph', active: false },
  { id: 'saved', icon: '💾', label: 'Saved', active: false },
  { id: 'profile', icon: '👤', label: 'Profile', active: false },
];

export default function BottomNav() {
  const handleNavPress = (tabId) => {
    // For now, just log - we can implement actual navigation later
    console.log(`Navigate to ${tabId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navContainer}>
        {navTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => handleNavPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.navIcon, tab.active && styles.activeNavIcon]}>
              {tab.icon}
            </Text>
            <Text style={[styles.navLabel, tab.active && styles.activeNavLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    paddingBottom: 8,
    paddingTop: 12,
  },
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingVertical: 4,
  },
  navIcon: {
    fontFamily: 'Material Symbols Outlined',
    fontSize: 20,
    color: '#64748B',
    fontWeight: '400',
  },
  activeNavIcon: {
    color: '#EC5B13',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  activeNavLabel: {
    color: '#EC5B13',
  },
});
