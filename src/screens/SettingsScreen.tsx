import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { getTotalTickets, getTicketState } from '../monetize/ticketStore';
import { restorePurchases, isSubscriptionActive } from '../monetize/iapService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setLocale, getCurrentLocale, t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const SNS_LINKS = [
  { name: 'YouTube', icon: '▶️', url: 'https://youtube.com/@shinrawonderfultoys' },
  { name: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com/@shinrawonderfultoys' },
  { name: 'Instagram', icon: '📸', url: 'https://www.instagram.com/shinrapocket' },
  { name: '公式LINE', icon: '💬', url: 'https://lin.ee/H90H4xB' },
  { name: 'Vlog', icon: '🎬', url: 'https://www.youtube.com/@shinrapocket' },
  { name: 'ショップ', icon: '🛍️', url: 'https://shinratoys.base.shop' },
];

const APP_VERSION = '1.0.0';
const PRIVACY_POLICY_URL = 'https://shinrapocket.example.com/privacy';
const TERMS_URL = 'https://shinrapocket.example.com/terms';

const STORAGE_KEY_BGM = '@shinra_bgm_enabled';
const STORAGE_KEY_SE = '@shinra_se_enabled';

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState<'ja' | 'en'>(getCurrentLocale());
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [seEnabled, setSeEnabled] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const subscribed = isSubscriptionActive();
  const tickets = getTotalTickets();
  const ticketLabel = tickets === Infinity ? '∞' : `${tickets}`;

  // Load sound preferences from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [bgm, se] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_BGM),
          AsyncStorage.getItem(STORAGE_KEY_SE),
        ]);
        if (bgm !== null) setBgmEnabled(bgm === 'true');
        if (se !== null) setSeEnabled(se === 'true');
      } catch {
        // use defaults
      }
    })();
  }, []);

  const handleLanguageChange = useCallback((locale: 'ja' | 'en') => {
    setLanguage(locale);
    setLocale(locale);
  }, []);

  const handleBgmToggle = useCallback(async (value: boolean) => {
    setBgmEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_BGM, String(value));
    } catch {
      // ignore
    }
  }, []);

  const handleSeToggle = useCallback(async (value: boolean) => {
    setSeEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_SE, String(value));
    } catch {
      // ignore
    }
  }, []);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored.length > 0) {
        Alert.alert(
          t('settings.restoreComplete'),
          t('settings.restoreCompleteMessage', { count: restored.length }),
        );
      } else {
        Alert.alert(
          t('settings.restoreNone'),
          t('settings.restoreNoneMessage'),
        );
      }
    } catch {
      Alert.alert(
        t('settings.restoreError'),
        t('settings.restoreErrorMessage'),
      );
    }
    setRestoring(false);
  };

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { top: insets.top + 10 }]}
        >
          <Text style={styles.backText}>← {language === 'ja' ? '戻る' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  language === 'ja' && styles.langButtonActive,
                ]}
                onPress={() => handleLanguageChange('ja')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    language === 'ja' && styles.langButtonTextActive,
                  ]}
                >
                  日本語
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  language === 'en' && styles.langButtonActive,
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text
                  style={[
                    styles.langButtonText,
                    language === 'en' && styles.langButtonTextActive,
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sound */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.sound')}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('settings.bgm')}</Text>
              <Switch
                value={bgmEnabled}
                onValueChange={handleBgmToggle}
                trackColor={{ false: '#333', true: COLORS.gold }}
                thumbColor={bgmEnabled ? '#fff' : '#888'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('settings.se')}</Text>
              <Switch
                value={seEnabled}
                onValueChange={handleSeToggle}
                trackColor={{ false: '#333', true: COLORS.gold }}
                thumbColor={seEnabled ? '#fff' : '#888'}
              />
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('settings.subscription')}</Text>
              <Text
                style={[
                  styles.settingValue,
                  subscribed && styles.settingValueActive,
                ]}
              >
                {subscribed ? t('settings.subscriptionActive') : t('settings.subscriptionInactive')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('settings.tickets')}</Text>
              <Text style={styles.settingValue}>
                {'🎫'} {ticketLabel}{language === 'ja' ? '枚' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>
            {restoring ? t('settings.restoring') : t('settings.restorePurchases')}
          </Text>
        </TouchableOpacity>

        {/* Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.other')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            >
              <Text style={styles.linkText}>{t('settings.privacy')}</Text>
              <Text style={styles.linkArrow}>{'›'}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL(TERMS_URL)}
            >
              <Text style={styles.linkText}>{t('settings.terms')}</Text>
              <Text style={styles.linkArrow}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SNS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SNS</Text>
          <View style={styles.snsRow}>
            {SNS_LINKS.map((link) => (
              <TouchableOpacity
                key={link.name}
                style={styles.snsButton}
                onPress={() => Linking.openURL(link.url)}
                activeOpacity={0.7}
              >
                <Text style={styles.snsIcon}>{link.icon}</Text>
                <Text style={styles.snsName}>{link.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            Shinra Pocket v{APP_VERSION}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    ...FONTS.regular,
  },
  title: {
    fontSize: 28,
    color: COLORS.gold,
    letterSpacing: 4,
    ...FONTS.heavy,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONTS.bold,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.bold,
  },
  settingValueActive: {
    color: COLORS.gold,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  langButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  langButtonActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  langButtonText: {
    fontSize: 15,
    color: COLORS.textMuted,
    ...FONTS.bold,
  },
  langButtonTextActive: {
    color: COLORS.gold,
  },
  actionButton: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  actionButtonText: {
    fontSize: 16,
    color: COLORS.gold,
    ...FONTS.bold,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkText: {
    fontSize: 15,
    color: COLORS.blue,
    ...FONTS.regular,
  },
  linkArrow: {
    fontSize: 22,
    color: COLORS.textMuted,
  },
  snsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  snsButton: {
    flex: 1,
    minWidth: '40%' as unknown as number,
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  snsIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  snsName: {
    fontSize: 11,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    ...FONTS.regular,
  },
});
