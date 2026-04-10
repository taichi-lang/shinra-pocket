/**
 * ShopScreen — Ticket-based shop for ShinraPocket
 * Displays premium subscription, free ad tickets, and today's ticket info.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../utils/theme';
import { useNavigation } from '@react-navigation/native';
import { lightTap, mediumTap, heavyTap, success as hapticSuccess } from '../utils/haptics';
import {
  getTicketState,
  getTotalTickets,
  earnAdTicket,
  initTicketStore,
} from './ticketStore';
import { type TicketState, FREE_DAILY_TICKETS, MAX_AD_TICKETS_PER_DAY } from './ticketTypes';
import {
  purchaseProduct,
  restorePurchases,
  isSubscriptionActive,
  PREMIUM_SUBSCRIPTION,
} from './iapService';
import { showRewarded } from './adService';
import { t } from '../i18n';

// ============================================================
// ShopScreen Component
// ============================================================

export default function ShopScreen({ navigation }: { navigation?: any }) {
  const insets = useSafeAreaInsets();
  const [purchasing, setPurchasing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [tickets, setTickets] = useState<TicketState | null>(null);
  const [totalTickets, setTotalTickets] = useState(0);

  const refreshState = useCallback(() => {
    setSubscribed(isSubscriptionActive());
    const state = getTicketState();
    setTickets(state);
    setTotalTickets(getTotalTickets());
  }, []);

  useEffect(() => {
    initTicketStore();
    refreshState();
  }, [refreshState]);

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  const handleSubscribe = useCallback(async () => {
    if (purchasing || subscribed) return;
    heavyTap();
    setPurchasing(true);
    const success = await purchaseProduct(PREMIUM_SUBSCRIPTION.id);
    setPurchasing(false);

    if (success) {
      hapticSuccess();
      Alert.alert('購入完了', 'プレミアムプランに加入しました！');
      refreshState();
    } else {
      Alert.alert('購入失敗', '購入を完了できませんでした。もう一度お試しください。');
    }
  }, [purchasing, subscribed, refreshState]);

  const handleWatchAd = useCallback(async () => {
    if (!tickets) return;
    mediumTap();
    const remaining = MAX_AD_TICKETS_PER_DAY - tickets.adTicketsUsedToday;
    if (remaining <= 0) {
      Alert.alert('上限到達', '今日の広告チケットは上限に達しました。');
      return;
    }

    const success = await showRewarded(() => {
      hapticSuccess();
      earnAdTicket();
      refreshState();
    });

    if (!success) {
      Alert.alert('広告を表示できません', 'しばらくしてからもう一度お試しください。');
    }
  }, [tickets, refreshState]);

  const handleRestore = useCallback(async () => {
    lightTap();
    setPurchasing(true);
    const restored = await restorePurchases();
    setPurchasing(false);
    refreshState();

    if (restored.length > 0) {
      hapticSuccess();
      Alert.alert('復元完了', `${restored.length}件の購入を復元しました。`);
    } else {
      Alert.alert('復元なし', '復元できる購入が見つかりませんでした。');
    }
  }, [refreshState]);

  // ----------------------------------------------------------
  // Derived values
  // ----------------------------------------------------------

  const freeRemaining = tickets ? tickets.freeTickets : 0;
  const adRemaining = tickets
    ? MAX_AD_TICKETS_PER_DAY - tickets.adTicketsUsedToday
    : 0;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← 戻る</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>ショップ</Text>
            <View style={styles.ticketBadge}>
            <Text style={styles.ticketBadgeText}>
              🎟️ {subscribed ? '∞' : totalTickets}枚
            </Text>
            </View>
          </View>
        </View>

        {/* Premium Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プレミアム</Text>
          <View style={[styles.card, styles.premiumCard]}>
            <View style={styles.premiumHeader}>
              <Text style={styles.premiumIcon}>👑</Text>
              <View style={styles.premiumTitleWrap}>
                <Text style={styles.premiumTitle}>プレミアムプラン</Text>
                <Text style={styles.premiumPrice}>¥580/月</Text>
              </View>
            </View>
            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>✦ 無制限チケット</Text>
              <Text style={styles.benefitItem}>✦ ゲーム6解放</Text>
              <Text style={styles.benefitItem}>✦ 広告非表示</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                subscribed && styles.subscribeButtonActive,
              ]}
              onPress={handleSubscribe}
              disabled={purchasing || subscribed}
              activeOpacity={0.7}
            >
              {purchasing ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Text
                  style={[
                    styles.subscribeButtonText,
                    subscribed && styles.subscribeButtonTextActive,
                  ]}
                >
                  {subscribed ? '加入中' : '登録する'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Free Tickets — Ad */}
        {!subscribed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>無料チケット</Text>
            <TouchableOpacity
              style={[styles.card, styles.adCard]}
              onPress={handleWatchAd}
              disabled={adRemaining <= 0}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>🎬</Text>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>広告を見てチケットGET</Text>
                <Text style={styles.cardDescription}>
                  残り: {adRemaining}/{MAX_AD_TICKETS_PER_DAY}
                </Text>
              </View>
              <View
                style={[
                  styles.freeTag,
                  adRemaining <= 0 && styles.freeTagDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.freeTagText,
                    adRemaining <= 0 && styles.freeTagTextDisabled,
                  ]}
                >
                  FREE
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Tickets Info */}
        {!subscribed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日のチケット</Text>
            <View style={[styles.card, styles.infoCard]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>無料チケット</Text>
                <Text style={styles.infoValue}>
                  {freeRemaining}/{FREE_DAILY_TICKETS}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>広告チケット</Text>
                <Text style={styles.infoValue}>
                  {tickets?.adTickets ?? 0}
                </Text>
              </View>
              <Text style={styles.infoNote}>
                チケットは毎日リセットされます
              </Text>
            </View>
          </View>
        )}

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={purchasing}
          activeOpacity={0.7}
        >
          {purchasing ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : (
            <Text style={styles.restoreText}>購入を復元</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            すべての購入はApp Storeアカウントを通じて処理されます。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 4,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: COLORS.textPrimary,
    ...FONTS.heavy,
  },
  ticketBadge: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  ticketBadgeText: {
    fontSize: 18,
    color: COLORS.gold,
    ...FONTS.bold,
  },

  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    ...FONTS.bold,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  /* Cards (shared) */
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  cardIcon: {
    fontSize: 30,
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },

  /* Premium Card */
  premiumCard: {
    borderColor: COLORS.cardBorderActive,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  premiumTitleWrap: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  premiumPrice: {
    fontSize: 14,
    color: COLORS.gold,
    ...FONTS.bold,
    marginTop: 2,
  },
  benefitsList: {
    marginBottom: 14,
    paddingLeft: 4,
  },
  benefitItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.regular,
    marginBottom: 4,
  },
  subscribeButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  subscribeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  subscribeButtonText: {
    fontSize: 16,
    color: COLORS.bg,
    ...FONTS.heavy,
  },
  subscribeButtonTextActive: {
    color: COLORS.textMuted,
  },

  /* Ad Card */
  adCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(136, 170, 255, 0.3)',
  },
  freeTag: {
    marginLeft: 12,
    backgroundColor: 'rgba(0, 200, 100, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  freeTagDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  freeTagText: {
    fontSize: 13,
    color: '#00cc66',
    ...FONTS.bold,
  },
  freeTagTextDisabled: {
    color: COLORS.textMuted,
  },

  /* Info Card */
  infoCard: {
    paddingVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 4,
    marginHorizontal: 4,
  },
  infoNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.regular,
    textAlign: 'center',
    marginTop: 10,
  },

  /* Restore & Footer */
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  restoreText: {
    fontSize: 14,
    color: COLORS.blue,
    ...FONTS.bold,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    ...FONTS.regular,
  },
});
