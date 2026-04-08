import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { lightTap, mediumTap } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTotalTickets } from '../monetize/ticketStore';
import { t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

interface MenuItem {
  key: string;
  labelKey: string;
  screen: keyof RootStackParamList;
  params?: object;
  primary?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'cpu', labelKey: 'menu.cpu', screen: 'GameSelect', params: { mode: 'cpu' }, primary: true },
  { key: 'local', labelKey: 'menu.local', screen: 'GameSelect', params: { mode: 'local' }, primary: true },
  { key: 'online', labelKey: 'menu.online', screen: 'GameSelect', params: { mode: 'online' }, primary: true },
  { key: 'ranking', labelKey: 'menu.ranking', screen: 'Ranking' },
  { key: 'shop', labelKey: 'menu.shop', screen: 'Shop' },
  { key: 'serial', labelKey: 'menu.serialCode', screen: 'SerialCode' },
  { key: 'settings', labelKey: 'menu.settings', screen: 'Settings' },
];

export default function MenuScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState(getTotalTickets());

  useFocusEffect(
    useCallback(() => {
      setTickets(getTotalTickets());
    }, [])
  );
  const ticketLabel = tickets === Infinity ? '∞' : `${tickets}${t('menu.tickets') || '枚'}`;

  const handlePress = (item: MenuItem) => {
    if (item.primary) {
      mediumTap();
    } else {
      lightTap();
    }
    navigation.navigate(item.screen as any, item.params as any);
  };

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>SHINRA POCKET</Text>
        <Text style={styles.subtitle}>{t('menu.selectGame')}</Text>
        <Text style={styles.ticketBadge}>{'🎫'} {ticketLabel}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.menuButton,
              item.primary && styles.menuButtonPrimary,
            ]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
            accessibilityLabel={t(item.labelKey)}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.menuButtonText,
                item.primary && styles.menuButtonTextPrimary,
              ]}
            >
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
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
  },
  title: {
    fontSize: 28,
    color: COLORS.gold,
    letterSpacing: 6,
    ...FONTS.heavy,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    ...FONTS.regular,
  },
  ticketBadge: {
    fontSize: 14,
    color: COLORS.gold,
    marginTop: 6,
    ...FONTS.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  menuButton: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: 16,
    alignItems: 'center',
  },
  menuButtonPrimary: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.cardBorderActive,
    padding: 20,
  },
  menuButtonText: {
    fontSize: 16,
    color: COLORS.gold,
    ...FONTS.bold,
  },
  menuButtonTextPrimary: {
    fontSize: 18,
    ...FONTS.heavy,
  },
});
