import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@shinra_user_profile';

export interface UserProfile {
  displayName: string;
  countryFlag: string;    // emoji flag like 🇯🇵
  countryCode: string;    // ISO 3166-1 alpha-2 like 'JP'
  googleId?: string;
  avatarUrl?: string;
  isSetupComplete: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Player',
  countryFlag: '🏳️',
  countryCode: '',
  isSetupComplete: false,
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    if (json) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(json) };
    }
    return { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function isSetupComplete(): Promise<boolean> {
  try {
    const json = await AsyncStorage.getItem(PROFILE_KEY);
    if (json) {
      const profile: UserProfile = JSON.parse(json);
      return profile.isSetupComplete === true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
