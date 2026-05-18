import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function TagChip({ text, active = false, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.activeChip : styles.inactiveChip]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: '#EC5B13',
  },
  inactiveChip: {
    backgroundColor: '#1E1E1E',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inactiveText: {
    color: '#CBD5E1',
    fontWeight: '500',
  },
});
