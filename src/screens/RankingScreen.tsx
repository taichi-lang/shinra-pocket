import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getLeaderboard,
  getMyRanking,
  type PlayerRanking,
} from '../ranking/rankingService';

type Props = NativeStackScreenProps<RootStackParamList, 'Ranking'>;

interface RankEntry {
  rank: number;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

const GAME_TABS = [
  { key: 'game1', label: '三目並べ' },
  { key: 'game2', label: '一騎打ち' },
  { key: 'game3', label: '三つ巴' },
  { key: 'game4', label: 'パタパタ' },
  { key: 'game5', label: '日月の戦い' },
  { key: 'game6', label: '3×3クイズ' },
];

// Mock data for when server is unreachable
const MOCK_RANKINGS: RankEntry[] = [
  { rank: 1, name: '信長', rating: 142, wins: 55, losses: 13, draws: 3 },
  { rank: 2, name: '秀吉', rating: 138, wins: 50, losses: 12, draws: 5 },
  { rank: 3, name: '家康', rating: 131, wins: 42, losses: 11, draws: 8 },
  { rank: 4, name: '政宗', rating: 125, wins: 35, losses: 10, draws: 2 },
  { rank: 5, name: '謙信', rating: 119, wins: 28, losses: 9, draws: 4 },
  { rank: 6, name: '信玄', rating: 115, wins: 22, losses: 7, draws: 6 },
  { rank: 7, name: '光秀', rating: 108, wins: 15, losses: 7, draws: 1 },
  { rank: 8, name: '義経', rating: 104, wins: 10, losses: 6, draws: 3 },
  { rank: 9, name: '清盛', rating: 101, wins: 5, losses: 4, draws: 2 },
  { rank: 10, name: '道三', rating: 100, wins: 3, losses: 3, draws: 0 },
];

const MOCK_MY_RANKING: RankEntry = {
  rank: 0,
  name: 'あなた',
  rating: 100,
  wins: 0,
  losses: 0,
  draws: 0,
};

function toRankEntry(p: PlayerRanking, rank: number): RankEntry {
  return {
    rank,
    name: p.displayName,
    rating: p.rating,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws,
  };
}

export default function RankingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('game1');
  const [rankings, setRankings] = useState<RankEntry[]>(MOCK_RANKINGS);
  const [myRanking, setMyRanking] = useState<RankEntry>(MOCK_MY_RANKING);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const fetchData = useCallback(async (gameType: string) => {
    try {
      const [leaderboard, me] = await Promise.all([
        getLeaderboard(100, gameType),
        getMyRanking('local_player'), // TODO: use real player ID
      ]);

      if (leaderboard.length > 0) {
        setRankings(leaderboard.map((p, i) => toRankEntry(p, i + 1)));
        setUsingMock(false);
      } else {
        setRankings(MOCK_RANKINGS);
        setUsingMock(true);
      }

      setMyRanking({
        rank: 0,
        name: me.displayName,
        rating: me.rating,
        wins: me.wins,
        losses: me.losses,
        draws: me.draws,
      });
    } catch {
      setRankings(MOCK_RANKINGS);
      setMyRanking(MOCK_MY_RANKING);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [fetchData, activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(activeTab);
    setRefreshing(false);
  }, [fetchData, activeTab]);

  const renderMyRanking = () => (
    <View style={styles.mySection}>
      <Text style={styles.mySectionTitle}>マイランキング</Text>
      <View style={styles.myRow}>
        <View style={styles.myRatingBox}>
          <Text style={styles.myRatingLabel}>レート</Text>
          <Text style={styles.myRatingValue}>{myRanking.rating}</Text>
        </View>
        <View style={styles.myStatsBox}>
          <View style={styles.myStatItem}>
            <Text style={styles.myStatValue}>{myRanking.wins}</Text>
            <Text style={styles.myStatLabel}>勝</Text>
          </View>
          <View style={styles.myStatItem}>
            <Text style={styles.myStatValue}>{myRanking.losses}</Text>
            <Text style={styles.myStatLabel}>敗</Text>
          </View>
          <View style={styles.myStatItem}>
            <Text style={styles.myStatValue}>{myRanking.draws}</Text>
            <Text style={styles.myStatLabel}>引</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: RankEntry }) => {
    const isTop3 = item.rank <= 3;
    const rankColor =
      item.rank === 1
        ? '#ffd700'
        : item.rank === 2
          ? '#c0c0c0'
          : item.rank === 3
            ? '#cd7f32'
            : COLORS.textMuted;

    return (
      <View style={[styles.row, isTop3 && styles.rowTop3]}>
        <Text style={[styles.rank, { color: rankColor }]}>#{item.rank}</Text>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.stats}>
          <Text style={styles.rating}>{item.rating}</Text>
          <Text style={styles.record}>
            {item.wins}W / {item.losses}L / {item.draws}D
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={styles.container}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ランキング</Text>
        {usingMock && (
          <Text style={styles.mockBadge}>サンプルデータ</Text>
        )}
      </View>

      <View style={styles.tabs}>
        {GAME_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderMyRanking()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : (
        <FlatList
          data={rankings}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.rank)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.gold}
              colors={[COLORS.gold]}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>ランキングデータがありません</Text>
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
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
    fontSize: 24,
    color: COLORS.gold,
    marginTop: 8,
    ...FONTS.heavy,
  },
  mockBadge: {
    fontSize: 11,
    color: COLORS.orange,
    marginTop: 4,
    ...FONTS.bold,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
  },
  tabActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textMuted,
    ...FONTS.bold,
  },
  tabTextActive: {
    color: COLORS.gold,
  },
  // My Ranking section
  mySection: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: 14,
  },
  mySectionTitle: {
    fontSize: 13,
    color: COLORS.gold,
    marginBottom: 10,
    ...FONTS.bold,
  },
  myRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myRatingBox: {
    alignItems: 'center',
    marginRight: 24,
  },
  myRatingLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.regular,
  },
  myRatingValue: {
    fontSize: 32,
    color: COLORS.gold,
    ...FONTS.heavy,
  },
  myStatsBox: {
    flexDirection: 'row',
    gap: 20,
  },
  myStatItem: {
    alignItems: 'center',
  },
  myStatValue: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.heavy,
  },
  myStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.regular,
  },
  // Leaderboard
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 14,
    marginBottom: 8,
  },
  rowTop3: {
    borderColor: 'rgba(255,215,0,0.25)',
    backgroundColor: 'rgba(255,215,0,0.04)',
  },
  rank: {
    fontSize: 18,
    color: COLORS.gold,
    width: 48,
    ...FONTS.heavy,
  },
  name: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flex: 1,
    ...FONTS.bold,
  },
  stats: {
    alignItems: 'flex-end',
  },
  rating: {
    fontSize: 16,
    color: COLORS.gold,
    ...FONTS.heavy,
  },
  record: {
    fontSize: 11,
    color: COLORS.textMuted,
    ...FONTS.regular,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    ...FONTS.regular,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
    ...FONTS.regular,
  },
});
