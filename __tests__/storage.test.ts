import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from '../utils/storage';

describe('storage service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores and retrieves values with AsyncStorage', async () => {
    await storage.setItem('course', 'React Native');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('course', 'React Native');

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('React Native');
    const value = await storage.getItem('course');

    expect(AsyncStorage.getItem).toHaveBeenCalledWith('course');
    expect(value).toBe('React Native');
  });

  it('removes a stored value', async () => {
    await storage.removeItem('course');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('course');
  });
});
