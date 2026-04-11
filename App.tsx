import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import SetupScreen from './src/screens/SetupScreen';
import MenuScreen from './src/screens/MenuScreen';
import GameSelectScreen from './src/screens/GameSelectScreen';
import CoinSelectScreen from './src/screens/CoinSelectScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import RankingScreen from './src/screens/RankingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import RuleScreen from './src/screens/RuleScreen';
import ShopScreen from './src/monetize/ShopScreen';
import SerialCodeScreen from './src/monetize/SerialCodeScreen';
import OnlineLobbyScreen from './src/screens/OnlineLobbyScreen';
import OnlineGameScreen from './src/screens/OnlineGameScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import ErrorReportButton from './src/components/ErrorReportButton';
import { initAnalytics } from './src/analytics/analyticsService';
import { initCrashReporter } from './src/analytics/crashReporter';
import { initTicketStore } from './src/monetize/ticketStore';
import { isSetupComplete } from './src/services/userProfile';
import { CoinType } from './src/game/types';

export type GameId = 'game1' | 'game2' | 'game3' | 'game4' | 'game5' | 'game6';

export type RootStackParamList = {
  Splash: undefined;
  Setup: undefined;
  Menu: undefined;
  GameSelect: { mode: 'cpu' | 'local' | 'online' };
  CoinSelect: { mode: 'cpu' | 'local' | 'online'; gameId?: GameId };
  Game: { coin: CoinType; difficulty: 'normal' | 'hard'; gameId?: GameId; mode?: 'cpu' | 'local' | 'online'; coin2?: CoinType };
  Result: {
    result: 'player' | 'cpu' | 'draw' | 'timeout';
    coin: CoinType;
    mode: 'cpu' | 'local' | 'online';
    gameId?: GameId;
    difficulty?: 'normal' | 'hard';
    coin2?: CoinType;
  };
  Ranking: undefined;
  Shop: undefined;
  Settings: undefined;
  SerialCode: undefined;
  OnlineLobby: { coin: CoinType };
  OnlineGame: { coin: CoinType; roomId: string; playerId: string };
  Rule: { gameId: GameId };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>('Splash');
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    initCrashReporter();
    initAnalytics();
    initTicketStore();
    isSetupComplete().then((done) => setSetupDone(done));
  }, []);

  const handleStateChange = useCallback(() => {
    if (navigationRef.isReady()) {
      const route = navigationRef.getCurrentRoute();
      if (route?.name) {
        setCurrentScreen(route.name);
      }
    }
  }, []);

  // Wait for setup check before rendering navigator
  if (setupDone === null) {
    return (
      <View style={[styles.container, { backgroundColor: '#050510' }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName={setupDone ? 'Splash' : 'Setup'}
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: '#050510' },
            }}
          >
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="GameSelect" component={GameSelectScreen} />
            <Stack.Screen name="CoinSelect" component={CoinSelectScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Ranking" component={RankingScreen} />
            <Stack.Screen name="Shop" component={ShopScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="SerialCode" component={SerialCodeScreen} />
            <Stack.Screen name="OnlineLobby" component={OnlineLobbyScreen} />
            <Stack.Screen name="OnlineGame" component={OnlineGameScreen} />
            <Stack.Screen name="Rule" component={RuleScreen} />
          </Stack.Navigator>
        </NavigationContainer>
        {currentScreen !== 'Splash' && (
          <ErrorReportButton screenName={currentScreen} />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
