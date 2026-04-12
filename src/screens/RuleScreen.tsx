import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, GameId } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Rule'>;

const { height: SCREEN_H } = Dimensions.get('window');
const COMPACT = SCREEN_H < 700;
const fs = (base: number) => (COMPACT ? base - 1 : base);

/* ─── Rule data for each game ─── */

function Game1Rule() {
  return (
    <>
      <Text style={s.heading}>{t('rule.game1.title')}</Text>
      <Text style={s.purpose}>{t('rule.game1.purpose')}</Text>

      <Text style={s.label}>{t('rule.howToPlay')}</Text>

      <Text style={s.body}>{t('rule.game1.step1')}</Text>
      <View style={s.gridRow}>
        <Cell c="🔴" /><Cell /><Cell c="🔵" />
      </View>
      <View style={s.gridRow}>
        <Cell /><Cell c="🔴" /><Cell />
      </View>
      <View style={s.gridRow}>
        <Cell c="🔵" /><Cell /><Cell />
      </View>

      <Text style={s.body}>{t('rule.game1.step2')}</Text>
      <Text style={s.note}>{t('rule.game1.step2note')}</Text>

      <Text style={s.body}>{t('rule.game1.step3')}</Text>
      <View style={s.gridRow}>
        <Cell c="🔴" /><Cell c="🔴" /><Cell c="🔴" />
      </View>
      <Text style={s.win}>{t('rule.game1.winExample')}</Text>

      <Text style={s.warn}>{t('rule.game1.timer')}</Text>
      <Text style={s.note}>{t('rule.game1.timerNote')}</Text>
    </>
  );
}

function Game2Rule() {
  return (
    <>
      <Text style={s.heading}>{t('rule.game2.title')}</Text>
      <Text style={s.purpose}>{t('rule.game2.purpose')}</Text>

      <Text style={s.label}>{t('rule.howToPlay')}</Text>
      <Text style={s.body}>{t('rule.game2.step1')}</Text>

      <View style={s.gridRow}>
        <MiniCell t="①" /><MiniCell t="①" /><MiniCell t="②" />
      </View>
      <View style={s.gridRow}>
        <MiniCell t="②" /><View style={s.miniCellEmpty} /><View style={s.miniCellEmpty} />
      </View>
      <Text style={s.note}>{t('rule.game2.step1note')}</Text>

      <Text style={s.body}>{t('rule.game2.step2')}</Text>
      <Text style={s.body}>{t('rule.game2.step3')}</Text>
      <View style={s.stackRow}>
        <View style={s.stackCell}>
          <Text style={s.stackTop}>{'②'}</Text>
          <Text style={s.stackBottom}>{'①'}</Text>
        </View>
        <Text style={s.note}>{t('rule.game2.step3note')}</Text>
      </View>
      <Text style={s.body}>{t('rule.game2.step4')}</Text>
      <Text style={s.note}>{t('rule.game2.step4note')}</Text>
      <Text style={s.body}>{t('rule.game2.step5')}</Text>
    </>
  );
}

function Game3Rule() {
  return (
    <>
      <Text style={s.heading}>{t('rule.game3.title')}</Text>
      <Text style={s.purpose}>{t('rule.game3.purpose')}</Text>

      <Text style={s.label}>{t('rule.howToPlay')}</Text>
      <Text style={s.body}>{t('rule.game3.step1')}</Text>

      <View style={s.gridRow}>
        <Cell c="🔴" /><Cell /><Cell c="🔵" />
      </View>
      <View style={s.gridRow}>
        <Cell /><Cell c="🟣" /><Cell />
      </View>
      <View style={s.gridRow}>
        <Cell c="🔵" /><Cell /><Cell c="🔴" />
      </View>

      <Text style={s.body}>{t('rule.game3.step2')}</Text>
      <Text style={s.body}>{t('rule.game3.step3')}</Text>
      <Text style={s.body}>{t('rule.game3.step4')}</Text>
      <Text style={s.body}>{t('rule.game3.step5')}</Text>
      <Text style={s.warn}>{t('rule.game3.cpuNote')}</Text>
    </>
  );
}

function Game4Rule() {
  return (
    <>
      <Text style={s.heading}>{t('rule.game4.title')}</Text>
      <Text style={s.purpose}>{t('rule.game4.purpose')}</Text>

      <Text style={s.label}>{t('rule.howToPlay')}</Text>
      <Text style={s.body}>{t('rule.game4.step1')}</Text>
      <Text style={s.body}>{t('rule.game4.step2')}</Text>
      <View style={s.mancalaRow}>
        <View style={s.mancalaGoal}><Text style={s.mancalaGoalText}>G</Text></View>
        <View>
          <View style={s.gridRow}>
            <MiniCell t="4" /><MiniCell t="4" /><MiniCell t="4" />
          </View>
          <View style={s.gridRow}>
            <MiniCell t="4" /><MiniCell t="4" /><MiniCell t="4" />
          </View>
        </View>
        <View style={s.mancalaGoal}><Text style={s.mancalaGoalText}>G</Text></View>
      </View>
      <Text style={s.note}>{t('rule.game4.step2note')}</Text>

      <Text style={s.body}>{t('rule.game4.step3')}</Text>
      <Text style={s.body}>{t('rule.game4.step4')}</Text>
      <Text style={s.note}>{t('rule.game4.step4note')}</Text>
      <Text style={s.body}>{t('rule.game4.step5')}</Text>
      <Text style={s.note}>{t('rule.game4.step5note')}</Text>
    </>
  );
}

function Game5Rule() {
  return (
    <>
      <Text style={s.heading}>{t('rule.game5.title')}</Text>
      <Text style={s.purpose}>{t('rule.game5.purpose')}</Text>

      <Text style={s.label}>{t('rule.howToPlay')}</Text>
      <Text style={s.body}>{t('rule.game5.step1')}</Text>

      <View style={s.gridRow}>
        <MiniCell t="🔥" /><MiniCell t="👑" /><MiniCell t="💧" />
      </View>
      <View style={s.gridRow}>
        <View style={s.miniCellEmpty} /><View style={s.miniCellEmpty} /><View style={s.miniCellEmpty} />
      </View>
      <View style={s.gridRow}>
        <MiniCell t="💧" /><MiniCell t="👑" /><MiniCell t="🔥" />
      </View>

      <Text style={s.body}>{t('rule.game5.step2')}</Text>
      <Text style={s.note}>{t('rule.game5.piece_king')}</Text>
      <Text style={s.note}>{t('rule.game5.piece_fire')}</Text>
      <Text style={s.note}>{t('rule.game5.piece_water')}</Text>
      <Text style={s.body}>{t('rule.game5.step3')}</Text>
      <Text style={s.body}>{t('rule.game5.step4')}</Text>

      <Text style={s.label}>{t('rule.game5.rulesLabel')}</Text>
      <Text style={s.note}>{t('rule.game5.rule1')}</Text>
      <Text style={s.note}>{t('rule.game5.rule2')}</Text>
      <Text style={s.warn}>{t('rule.game5.timer')}</Text>
    </>
  );
}

function Game6Rule() {
  return (
    <>
      <Text style={s.heading}>{t('rule.game6.title')}</Text>
      <Text style={s.purpose}>{t('rule.game6.purpose')}</Text>

      <Text style={s.label}>{t('rule.howToPlay')}</Text>
      <Text style={s.body}>{t('rule.game6.step1')}</Text>
      <Text style={s.body}>{t('rule.game6.step2')}</Text>
      <Text style={s.note}>{t('rule.game6.step2note')}</Text>

      <View style={s.gridRow}>
        <MiniCell t="2" /><MiniCell t="7" /><MiniCell t="6" />
        <Text style={s.sumLabel}>{'→15'}</Text>
      </View>
      <View style={s.gridRow}>
        <MiniCell t="9" /><MiniCell t="5" /><MiniCell t="1" />
        <Text style={s.sumLabel}>{'→15'}</Text>
      </View>
      <View style={s.gridRow}>
        <MiniCell t="4" /><MiniCell t="3" /><MiniCell t="8" />
        <Text style={s.sumLabel}>{'→15'}</Text>
      </View>

      <Text style={s.body}>{t('rule.game6.step3')}</Text>
      <Text style={s.body}>{t('rule.game6.step4')}</Text>
      <Text style={s.warn}>{t('rule.game6.premium')}</Text>
    </>
  );
}

/* ─── Helper components ─── */

function Cell({ c }: { c?: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellText}>{c || ' '}</Text>
    </View>
  );
}

function MiniCell({ t: text }: { t: string }) {
  return (
    <View style={s.miniCell}>
      <Text style={s.miniCellText}>{text}</Text>
    </View>
  );
}

const RULE_COMPONENTS: Record<GameId, () => React.JSX.Element> = {
  game1: Game1Rule,
  game2: Game2Rule,
  game3: Game3Rule,
  game4: Game4Rule,
  game5: Game5Rule,
  game6: Game6Rule,
};

/* ─── Main screen ─── */

export default function RuleScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { gameId } = route.params;
  const RuleContent = RULE_COMPONENTS[gameId];

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={s.container}
    >
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <RuleContent />

        <View style={s.bottomSpacer} />
        <TouchableOpacity
          style={s.closeButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.closeButtonText}>{t('common.close')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

/* ─── Styles ─── */

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: fs(24),
    color: COLORS.gold,
    textAlign: 'left',
    marginBottom: COMPACT ? 4 : 8,
    ...FONTS.heavy,
  },
  purpose: {
    fontSize: fs(15),
    color: COLORS.gold,
    textAlign: 'left',
    marginBottom: COMPACT ? 6 : 10,
    ...FONTS.bold,
  },
  label: {
    fontSize: fs(16),
    color: COLORS.textPrimary,
    textAlign: 'left',
    marginTop: COMPACT ? 4 : 8,
    marginBottom: COMPACT ? 2 : 4,
    ...FONTS.bold,
  },
  body: {
    fontSize: fs(14),
    color: COLORS.textPrimary,
    textAlign: 'left',
    lineHeight: COMPACT ? 20 : 22,
    ...FONTS.regular,
  },
  note: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    textAlign: 'left',
    lineHeight: COMPACT ? 18 : 20,
    paddingLeft: 12,
    ...FONTS.regular,
  },
  warn: {
    fontSize: fs(14),
    color: COLORS.orange,
    textAlign: 'left',
    marginTop: COMPACT ? 4 : 6,
    ...FONTS.bold,
  },
  win: {
    fontSize: fs(13),
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 2,
    ...FONTS.bold,
  },
  sumLabel: {
    fontSize: fs(13),
    color: COLORS.gold,
    marginLeft: 4,
    alignSelf: 'center',
    ...FONTS.bold,
  },
  // Grid cells
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 1,
  },
  cell: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  cellText: {
    fontSize: 18,
  },
  miniCell: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
  },
  miniCellEmpty: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    margin: 1,
  },
  miniCellText: {
    fontSize: fs(14),
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  // Stack (game2)
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  stackCell: {
    alignItems: 'center',
  },
  stackTop: {
    fontSize: fs(16),
    color: COLORS.gold,
    ...FONTS.bold,
  },
  stackBottom: {
    fontSize: fs(12),
    color: COLORS.textMuted,
    ...FONTS.regular,
  },
  // Mancala (game4)
  mancalaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    gap: 4,
  },
  mancalaGoal: {
    width: 28,
    height: 60,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mancalaGoalText: {
    fontSize: fs(14),
    color: COLORS.gold,
    ...FONTS.bold,
  },
  // Bottom
  bottomSpacer: {
    height: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: COLORS.gold,
    ...FONTS.bold,
  },
});
