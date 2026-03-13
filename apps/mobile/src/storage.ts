import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SettingsStore {
  getSavedUrl(): Promise<string | null>;
  saveUrl(url: string): Promise<void>;
  clearUrl(): Promise<void>;
}

const STORED_URL_KEY = "pocodex.mobile.saved-url";

export const asyncStorageSettingsStore: SettingsStore = {
  async getSavedUrl() {
    return AsyncStorage.getItem(STORED_URL_KEY);
  },
  async saveUrl(url) {
    await AsyncStorage.setItem(STORED_URL_KEY, url);
  },
  async clearUrl() {
    await AsyncStorage.removeItem(STORED_URL_KEY);
  },
};
