import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS } from '../utils/theme';
import { CONFIG } from '../config';
import { t } from '../i18n';

interface ErrorReportButtonProps {
  screenName: string;
  screenParams?: Record<string, unknown>;
}

export default function ErrorReportButton({ screenName, screenParams }: ErrorReportButtonProps) {
  const [visible, setVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!description.trim()) {
      Alert.alert(t('errorReport.inputError'), t('errorReport.inputErrorMessage'));
      return;
    }

    setSending(true);
    try {
      const playerId = (await AsyncStorage.getItem('playerId')) ?? 'unknown';
      const { width, height } = Dimensions.get('window');

      const osLabel = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
      const osVersion = String(Platform.Version);
      const deviceInfoStr = `${osLabel} ${osVersion} | ${width}x${height}`;

      // 詳細な状況情報を自動収集
      const params = screenParams ?? {};
      const gameId = params.gameId ?? '';
      const mode = params.mode ?? '';
      const difficulty = params.difficulty ?? '';
      const contextParts = [screenName];
      if (gameId) contextParts.push(`ゲーム:${gameId}`);
      if (mode) contextParts.push(`モード:${mode}`);
      if (difficulty) contextParts.push(`難易度:${difficulty}`);
      const context = contextParts.join(' / ');

      const body = {
        playerId,
        screenName: context,
        description: `【状況】${context}\n【内容】${description.trim()}`,
        deviceInfo: deviceInfoStr,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      const res = await fetch(`${CONFIG.SERVER_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      Alert.alert(t('errorReport.success'), t('errorReport.successMessage'));
      setDescription('');
      setVisible(false);
    } catch (e) {
      Alert.alert(t('errorReport.failure'), t('errorReport.failureMessage'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>!</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.title}>{t('errorReport.title')}</Text>
            <Text style={styles.subtitle}>{t('errorReport.screen', { screen: screenName })}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('errorReport.placeholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              editable={!sending}
            />

            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setDescription('');
                  setVisible(false);
                }}
                disabled={sending}
              >
                <Text style={styles.closeBtnText}>{t('errorReport.close')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>{t('errorReport.send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,68,68,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 20,
    ...FONTS.bold,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
    padding: 12,
    minHeight: 120,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    ...FONTS.bold,
  },
  sendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 15,
    ...FONTS.bold,
  },
});
