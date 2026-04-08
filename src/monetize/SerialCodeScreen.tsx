import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { COLORS, FONTS } from '../utils/theme';
import { redeemCode, RedeemResult } from './serialCodeService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'SerialCode'>;

export default function SerialCodeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;

  const handleRedeem = async () => {
    Keyboard.dismiss();
    if (!code.trim() || loading) return;

    setLoading(true);
    setResult(null);

    const res = await redeemCode(code);
    setResult(res);
    setLoading(false);

    if (res.success) {
      // Animate success
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }
  };

  const getResultMessage = (): { text: string; color: string } | null => {
    if (!result) return null;
    if (result.success) {
      // Dev codes have a custom message
      if (result.devMessage) {
        return {
          text: result.devMessage,
          color: COLORS.gold,
        };
      }
      return {
        text: `🎉 チケット ${result.tickets}枚 獲得！`,
        color: COLORS.gold,
      };
    }
    switch (result.error) {
      case 'already_redeemed':
        return { text: 'このコードは既に使用済みです', color: COLORS.orange };
      case 'expired':
        return { text: 'このコードは期限切れです', color: COLORS.red };
      case 'invalid':
      default:
        return { text: '無効なコードです', color: COLORS.red };
    }
  };

  const msg = getResultMessage();

  return (
    <LinearGradient
      colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd, COLORS.bg]}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎁 シリアルコード</Text>
        <Text style={styles.subtitle}>
          SNSで配布されたコードを入力してチケットを獲得しよう
        </Text>
      </View>

      {/* Input area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder={'コードを入力'}
          placeholderTextColor={COLORS.textMuted}
          value={code}
          onChangeText={(t) => {
            setCode(t.toUpperCase());
            setResult(null);
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={30}
          returnKeyType="done"
          onSubmitEditing={handleRedeem}
        />

        <TouchableOpacity
          style={[styles.redeemBtn, (!code.trim() || loading) && styles.redeemBtnDisabled]}
          onPress={handleRedeem}
          disabled={!code.trim() || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bg} size="small" />
          ) : (
            <Text style={styles.redeemBtnText}>コードを使う</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Result message */}
      {msg && (
        <Animated.View
          style={[
            styles.resultBox,
            result?.success && {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.resultText, { color: msg.color }]}>{msg.text}</Text>
        </Animated.View>
      )}
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
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    ...FONTS.regular,
  },
  title: {
    fontSize: 24,
    color: COLORS.gold,
    letterSpacing: 3,
    ...FONTS.heavy,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    ...FONTS.regular,
  },
  inputArea: {
    paddingHorizontal: 20,
    marginTop: 30,
    gap: 16,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 4,
    ...FONTS.bold,
  },
  redeemBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    opacity: 0.4,
  },
  redeemBtnText: {
    fontSize: 18,
    color: COLORS.bg,
    ...FONTS.heavy,
  },
  resultBox: {
    marginTop: 30,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  resultText: {
    fontSize: 20,
    textAlign: 'center',
    ...FONTS.bold,
  },
});
