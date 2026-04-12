import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getLocales } from 'expo-localization';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { COUNTRY_FLAGS, CountryFlag, codeToFlag, findByCode } from '../utils/countryFlags';
import { saveProfile, UserProfile } from '../services/userProfile';
import { t } from '../i18n';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

type Props = NativeStackScreenProps<RootStackParamList, 'Setup'>;

/** Detect the user's region code from device locale */
function detectRegionCode(): string {
  try {
    const locales = getLocales();
    return locales?.[0]?.regionCode ?? 'JP';
  } catch {
    return 'JP';
  }
}

/** Validate display name: 1-20 chars, no dangerous chars */
function isValidName(name: string): boolean {
  if (name.length < 1 || name.length > 20) return false;
  // block < > & " ' / \ to prevent injection
  return !/[<>&"'\\/]/.test(name);
}

export default function SetupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // Auth state
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
  } | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryFlag>(() => {
    const code = detectRegionCode();
    return findByCode(code) ?? COUNTRY_FLAGS[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Google Auth discovery
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
    },
    discovery
  );

  // Handle Google sign-in response
  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      fetchGoogleProfile(response.authentication.accessToken);
    }
  }, [response]);

  async function fetchGoogleProfile(accessToken: string) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setGoogleUser({
        id: data.id,
        name: data.name ?? '',
        avatarUrl: data.picture,
      });
      if (data.name && !displayName) {
        setDisplayName(data.name.slice(0, 20));
      }
    } catch {
      Alert.alert('Error', t('setup.googleProfileError'));
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    try {
      await promptAsync();
    } catch {
      setIsSigningIn(false);
    }
  }

  function handleSkipGoogle() {
    // Guest mode - just continue without Google
  }

  // Filtered country list
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRY_FLAGS;
    const q = searchQuery.toLowerCase();
    return COUNTRY_FLAGS.filter(
      (c) =>
        c.nameJa.includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  async function handleStart() {
    const trimmedName = displayName.trim();
    if (!isValidName(trimmedName)) {
      Alert.alert(t('setup.nameError'), t('setup.nameErrorMessage'));
      return;
    }

    setIsSaving(true);
    try {
      const profile: UserProfile = {
        displayName: trimmedName,
        countryFlag: selectedCountry.flag,
        countryCode: selectedCountry.code,
        googleId: googleUser?.id,
        avatarUrl: googleUser?.avatarUrl,
        isSetupComplete: true,
      };
      await saveProfile(profile);
      navigation.replace('Menu');
    } catch {
      Alert.alert('Error', t('setup.saveError'));
    } finally {
      setIsSaving(false);
    }
  }

  const canStart = displayName.trim().length >= 1 && isValidName(displayName.trim());

  const renderCountryItem = ({ item }: { item: CountryFlag }) => {
    const isSelected = item.code === selectedCountry.code;
    return (
      <TouchableOpacity
        style={[styles.countryItem, isSelected && styles.countryItemSelected]}
        onPress={() => setSelectedCountry(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.countryFlag}>{item.flag}</Text>
        <Text style={[styles.countryName, isSelected && styles.countryNameSelected]} numberOfLines={1}>
          {item.nameJa}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.splashBg, COLORS.bgGradientStart, COLORS.bg]}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerEmoji}>🪙</Text>
        <Text style={styles.headerTitle}>SHINRA POCKET</Text>
        <Text style={styles.headerSubtitle}>{t('setup.subtitle')}</Text>

        {/* Step 1: Google Sign-In */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('setup.step1')}</Text>

          {googleUser ? (
            <View style={styles.googleConnected}>
              <Text style={styles.googleConnectedText}>
                {t('setup.loggedInAs', { name: googleUser.name })}
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.googleButton, !request && styles.buttonDisabled]}
                onPress={handleGoogleSignIn}
                disabled={isSigningIn || !request}
                activeOpacity={0.7}
              >
                {isSigningIn ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.googleButtonText}>{t('setup.googleLogin')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipGoogle}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>{t('setup.skip')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Step 2: Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('setup.step2')}</Text>

          <View style={styles.namePreview}>
            <Text style={styles.namePreviewFlag}>{selectedCountry.flag}</Text>
            <Text style={styles.namePreviewText}>
              {displayName.trim() || 'Player'}
            </Text>
          </View>

          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={(text) => setDisplayName(text.slice(0, 20))}
            placeholder={t('setup.namePlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.charCount}>{displayName.length}/20</Text>
        </View>

        {/* Step 3: Country Flag */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('setup.step3')}</Text>

          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('setup.searchPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FlatList
            data={filteredCountries}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.code}
            numColumns={4}
            scrollEnabled={false}
            columnWrapperStyle={styles.countryRow}
            style={styles.countryGrid}
          />
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startButton, !canStart && styles.buttonDisabled]}
          onPress={handleStart}
          disabled={!canStart || isSaving}
          activeOpacity={0.7}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.startButtonText}>{t('setup.startGame')}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Header
  headerEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    color: COLORS.gold,
    textAlign: 'center',
    letterSpacing: 6,
    ...FONTS.heavy,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
    letterSpacing: 4,
    ...FONTS.bold,
  },

  // Section
  section: {
    marginBottom: 28,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 16,
    ...FONTS.bold,
  },

  // Google Sign-In
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    ...FONTS.bold,
  },
  skipButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONTS.regular,
  },
  googleConnected: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  googleConnectedText: {
    color: '#4CAF50',
    fontSize: 14,
    ...FONTS.bold,
  },

  // Name input
  namePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  namePreviewFlag: {
    fontSize: 28,
  },
  namePreviewText: {
    fontSize: 22,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },

  // Country search
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },

  // Country grid
  countryGrid: {
    maxHeight: 300,
  },
  countryRow: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  countryItem: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  countryItemSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  countryFlag: {
    fontSize: 28,
    marginBottom: 2,
  },
  countryName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    ...FONTS.regular,
  },
  countryNameSelected: {
    color: COLORS.gold,
    ...FONTS.bold,
  },

  // Start button
  startButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  startButtonText: {
    color: '#000',
    fontSize: 20,
    letterSpacing: 4,
    ...FONTS.heavy,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
