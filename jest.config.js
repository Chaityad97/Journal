module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-svg|expo(nent)?|@expo(nent)?/.*|expo-router|@expo/vector-icons|@react-navigation/.*|react-native-reanimated|react-native-safe-area-context)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
