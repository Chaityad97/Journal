import React from 'react';
import { Text, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native';

interface TagProps {
  text: string;
  style?: TextStyle;
}

export const Tag: React.FC<TagProps> = ({ text, style }) => {
  return (
    <Text style={[styles.tag, style]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#f0f0f0',
    color: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    marginRight: 6,
    marginBottom: 4,
  },
});
