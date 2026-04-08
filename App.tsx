import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import MenuScreen from './src/screens/MenuScreen';
import GameSelectScreen from './src/screens/GameSelectScreen';
import CoinSelectScreen from './src/screens/CoinSelectScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import RankingScreen from './src/screens/RankingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShopScreen from './src/monetize/ShopScreen';
import SerialCodeScreen from './src/monetize/SerialCodeScreen';
import OnlineLobbyScreen from './src/screens/OnlineLobbyScreen';
import OnlineGameScreen from './src/screens/OnlineGameScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { initAnalytics } from './src/analytics/analyticsService';
import { initCrashReporter } from './src/analytics/crashReporter';
import { initTicketStore } from './src/monetize/ticketStore';
import { CoinType } from './src/game/types';

export type GameId = 'game1' | 'game2' | 'game3' | 'game4' | 'game5' | 'game6';

export type RootStackParamList = {
  Splash: undefined;
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
  };
  Ranking: undefined;
  Shop: undefined;
  Settings: undefined;
  SerialCode: undefined;
  OnlineLobby: { coin: CoinType };
  OnlineGame: { coin: CoinType; roomId: string; playerId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    initCrashReporter();
    initAnalytics();
    initTicketStore();
  }, []);

  return (
    <ErrorBoundary>
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#050510' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
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
      </Stack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
