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
      return {
        text: `\uD83C\uDF89 \u30C1\u30B1\u30C3\u30C8 ${result.tickets}\u679A \u7372\u5F97\uFF01`,
        color: COLORS.gold,
      };
    }
    switch (result.error) {
      case 'already_redeemed':
        return { text: '\u3053\u306E\u30B3\u30FC\u30C9\u306F\u65E2\u306B\u4F7F\u7528\u6E08\u307F\u3067\u3059', color: COLORS.orange };
      case 'expired':
        return { text: '\u3053\u306E\u30B3\u30FC\u30C9\u306F\u671F\u9650\u5207\u308C\u3067\u3059', color: COLORS.red };
      case 'invalid':
      default:
        return { text: '\u7121\u52B9\u306A\u30B3\u30FC\u30C9\u3067\u3059', color: COLORS.red };
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
          <Text style={styles.backText}>{'\u2190'} \u623B\u308B</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{'\uD83C\uDF81'} \u30B7\u30EA\u30A2\u30EB\u30B3\u30FC\u30C9</Text>
        <Text style={styles.subtitle}>
          SNS\u3067\u914D\u5E03\u3055\u308C\u305F\u30B3\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u30C1\u30B1\u30C3\u30C8\u3092\u7372\u5F97\u3057\u3088\u3046
        </Text>
      </View>

      {/* Input area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder={'\u30B3\u30FC\u30C9\u3092\u5165\u529B'}
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
            <Text style={styles.redeemBtnText}>{'\u30B3\u30FC\u30C9\u3092\u4F7F\u3046'}</Text>
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
    fontSize: 13,
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
