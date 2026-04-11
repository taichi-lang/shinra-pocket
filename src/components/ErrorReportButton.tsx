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

interface ErrorReportButtonProps {
  screenName: string;
}

export default function ErrorReportButton({ screenName }: ErrorReportButtonProps) {
  const [visible, setVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!description.trim()) {
      Alert.alert('入力エラー', '問題の内容を入力してください');
      return;
    }

    setSending(true);
    try {
      const playerId = (await AsyncStorage.getItem('playerId')) ?? 'unknown';
      const { width, height } = Dimensions.get('window');

      const body = {
        playerId,
        screenName,
        description: description.trim(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          screenWidth: width,
          screenHeight: height,
        },
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0',
      };

      const res = await fetch(`${CONFIG.SERVER_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      Alert.alert('送信完了', 'エラー報告を送信しました。ありがとうございます！');
      setDescription('');
      setVisible(false);
    } catch (e) {
      Alert.alert('送信失敗', 'エラー報告の送信に失敗しました。後でもう一度お試しください。');
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
            <Text style={styles.title}>エラー報告</Text>
            <Text style={styles.subtitle}>画面: {screenName}</Text>

            <TextInput
              style={styles.input}
              placeholder="問題の内容を教えてください"
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
                <Text style={styles.closeBtnText}>閉じる</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>送信</Text>
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
