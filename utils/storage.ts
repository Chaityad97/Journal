import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback in-memory storage for development environments
const memoryStorage: { [key: string]: string | null } = {};

class StorageService {
  private isAsyncStorageAvailable: boolean = true;

  constructor() {
    this.checkAsyncStorageAvailability();
  }

  private async checkAsyncStorageAvailability() {
    try {
      // Test AsyncStorage availability
      await AsyncStorage.getItem('test');
      this.isAsyncStorageAvailable = true;
    } catch (error) {
      console.warn('AsyncStorage not available, using fallback storage');
      this.isAsyncStorageAvailable = false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isAsyncStorageAvailable) {
        return await AsyncStorage.getItem(key);
      }
      return memoryStorage[key] || null;
    } catch (error) {
      console.warn('Storage getItem error, using fallback:', error);
      return memoryStorage[key] || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.setItem(key, value);
      } else {
        memoryStorage[key] = value;
      }
    } catch (error) {
      console.warn('Storage setItem error, using fallback:', error);
      memoryStorage[key] = value;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.removeItem(key);
      } else {
        memoryStorage[key] = null;
      }
    } catch (error) {
      console.warn('Storage removeItem error, using fallback:', error);
      memoryStorage[key] = null;
    }
  }
}

// Export singleton instance
export const storage = new StorageService();
