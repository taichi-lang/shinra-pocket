import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, GameId } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Rule'>;

const { height: SCREEN_H } = Dimensions.get('window');
const COMPACT = SCREEN_H < 700;
const fs = (base: number) => (COMPACT ? base - 1 : base);

/* ─── Rule data for each game ─── */

function Game1Rule() {
  return (
    <>
      <Text style={s.heading}>{'🪙 三目並べ'}</Text>
      <Text style={s.purpose}>{'【目的】コインを3つ並べたら勝ち！'}</Text>

      <Text style={s.label}>{'📌 あそびかた'}</Text>

      <Text style={s.body}>{'① まず4枚ずつ順番にコインを置く'}</Text>
      <View style={s.gridRow}>
        <Cell c="🔴" /><Cell /><Cell c="🔵" />
      </View>
      <View style={s.gridRow}>
        <Cell /><Cell c="🔴" /><Cell />
      </View>
      <View style={s.gridRow}>
        <Cell c="🔵" /><Cell /><Cell />
      </View>

      <Text style={s.body}>{'② 全部置いたら移動フェーズ！'}</Text>
      <Text style={s.note}>{'   自分のコインを空いてるマスに動かせるよ'}</Text>

      <Text style={s.body}>{'③ タテ・ヨコ・ナナメに3つ揃えば勝ち！'}</Text>
      <View style={s.gridRow}>
        <Cell c="🔴" /><Cell c="🔴" /><Cell c="🔴" />
      </View>
      <Text style={s.win}>{'← 勝ち！'}</Text>

      <Text style={s.warn}>{'⏱️ 移動は制限時間あり（5秒→1秒）'}</Text>
      <Text style={s.note}>{'   時間切れは負け！'}</Text>
    </>
  );
}

function Game2Rule() {
  return (
    <>
      <Text style={s.heading}>{'⚔️ 一騎打ち'}</Text>
      <Text style={s.purpose}>{'【目的】コインを3つ並べたら勝ち！'}</Text>

      <Text style={s.label}>{'📌 あそびかた'}</Text>
      <Text style={s.body}>{'① 手持ちコイン: ①×2枚 ②×2枚'}</Text>
      <Text style={s.body}>{'② コインを空きマスに置く'}</Text>
      <Text style={s.body}>{'③ ②のコインは相手の①の上に重ねられる！'}</Text>
      <View style={s.stackRow}>
        <View style={s.stackCell}>
          <Text style={s.stackTop}>{'②'}</Text>
          <Text style={s.stackBottom}>{'①'}</Text>
        </View>
        <Text style={s.note}>{' ← 相手の①を上書き！'}</Text>
      </View>
      <Text style={s.body}>{'④ 盤上の自分のコインも移動できる'}</Text>
      <Text style={s.note}>{'   相手の小さいコインの上にも移動OK'}</Text>
      <Text style={s.body}>{'⑤ 一番上のコインで3つ揃えば勝ち！'}</Text>
    </>
  );
}

function Game3Rule() {
  return (
    <>
      <Text style={s.heading}>{'🔱 三つ巴'}</Text>
      <Text style={s.purpose}>{'【目的】3人でバトル！先に3つ並べた人の勝ち'}</Text>

      <Text style={s.label}>{'📌 あそびかた'}</Text>
      <Text style={s.body}>{'① 3人のプレイヤー（🔴赤 🔵青 🟣紫）'}</Text>
      <Text style={s.body}>{'② 各プレイヤー6枚のコイン（①②③が2枚ずつ）'}</Text>
      <Text style={s.body}>{'③ 大きい数字で相手のコインの上に重ねられる'}</Text>
      <Text style={s.body}>{'④ 配置が終わったら移動フェーズ'}</Text>
      <Text style={s.body}>{'⑤ 3つ揃えた人の勝ち！'}</Text>
      <Text style={s.warn}>{'🤖 CPU2体が相手だよ'}</Text>
    </>
  );
}

function Game4Rule() {
  return (
    <>
      <Text style={s.heading}>{'🫳 パタパタ'}</Text>
      <Text style={s.purpose}>{'【目的】ゴールにたくさんコインを集めよう！'}</Text>

      <Text style={s.label}>{'📌 あそびかた'}</Text>
      <Text style={s.body}>{'① 自分の穴を1つ選ぶ'}</Text>
      <Text style={s.body}>{'② 中のコインを1個ずつ反時計回りにまく'}</Text>
      <View style={s.gridRow}>
        <MiniCell t="4" /><MiniCell t="3" /><MiniCell t="2" />
      </View>
      <Text style={s.note}>{'   ⬇️ ぐるっと回る ⬇️'}</Text>
      <View style={s.gridRow}>
        <MiniCell t="4" /><MiniCell t="3" /><MiniCell t="2" />
      </View>
      <Text style={s.body}>{'③ 最後のコインがゴールに入ったらもう1回！'}</Text>
      <Text style={s.body}>{'④ 自分の空の穴に最後のコインが入ったら'}</Text>
      <Text style={s.note}>{'   → 反対側の相手のコインもゲット！'}</Text>
      <Text style={s.body}>{'⑤ どちらかの穴が全部空になったら終了'}</Text>
      <Text style={s.note}>{'   ゴールのコインが多い方が勝ち！'}</Text>
    </>
  );
}

function Game5Rule() {
  return (
    <>
      <Text style={s.heading}>{'☀️ 日月の戦い'}</Text>
      <Text style={s.purpose}>{'【目的】相手の王（太陽/月）を詰めろ！'}</Text>

      <Text style={s.label}>{'📌 あそびかた'}</Text>
      <Text style={s.body}>{'① 3×3のミニ将棋！'}</Text>
      <Text style={s.body}>{'② 駒の動き:'}</Text>
      <Text style={s.note}>{'   👑王 → 全方向に1マス'}</Text>
      <Text style={s.note}>{'   🔥火 → ナナメに1マス'}</Text>
      <Text style={s.note}>{'   💧水 → タテに1マス'}</Text>
      <Text style={s.body}>{'③ 相手の駒を取ったら自分の手持ちに'}</Text>
      <Text style={s.body}>{'④ 手持ちの駒を自分の陣地に置ける'}</Text>

      <Text style={s.label}>{'⚠️ ルール'}</Text>
      <Text style={s.note}>{'・同じ動きは2回まで（3回目は禁止）'}</Text>
      <Text style={s.note}>{'・動けなくなったら負け！'}</Text>
      <Text style={s.warn}>{'⏱️ 1ターン30秒'}</Text>
    </>
  );
}

function Game6Rule() {
  return (
    <>
      <Text style={s.heading}>{'🧩 3x3クイズ'}</Text>
      <Text style={s.purpose}>{'【目的】数字パズルを解こう！'}</Text>

      <Text style={s.label}>{'📌 あそびかた'}</Text>
      <Text style={s.body}>{'① 3×3のマスに数字を入れる'}</Text>
      <Text style={s.body}>{'② タテ・ヨコ・ナナメの合計を'}</Text>
      <Text style={s.note}>{'   全部同じ数にしよう！'}</Text>

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

      <Text style={s.body}>{'③ 間違えるとライフが減る（❤️❤️❤️）'}</Text>
      <Text style={s.body}>{'④ ヒントボタンで1マス教えてくれるよ'}</Text>
      <Text style={s.warn}>{'🔒 プレミアム限定ゲーム'}</Text>
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
      <View style={[s.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <RuleContent />

        <View style={s.bottomSpacer} />
        <TouchableOpacity
          style={s.closeButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={s.closeButtonText}>{'閉じる'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

/* ─── Styles ─── */

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: fs(24),
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: COMPACT ? 4 : 8,
    ...FONTS.heavy,
  },
  purpose: {
    fontSize: fs(15),
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: COMPACT ? 6 : 10,
    ...FONTS.bold,
  },
  label: {
    fontSize: fs(16),
    color: COLORS.textPrimary,
    marginTop: COMPACT ? 4 : 8,
    marginBottom: COMPACT ? 2 : 4,
    ...FONTS.bold,
  },
  body: {
    fontSize: fs(14),
    color: COLORS.textPrimary,
    lineHeight: COMPACT ? 20 : 22,
    ...FONTS.regular,
  },
  note: {
    fontSize: fs(13),
    color: COLORS.textSecondary,
    lineHeight: COMPACT ? 18 : 20,
    ...FONTS.regular,
  },
  warn: {
    fontSize: fs(14),
    color: COLORS.orange,
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
  // Bottom
  bottomSpacer: {
    flex: 1,
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
