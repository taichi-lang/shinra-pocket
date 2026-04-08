import React, { useEffect, useRef } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { logEvent } from '../analytics/analyticsService';
import Game1Screen from '../games/game1/Game1Screen';
import Game2Screen from '../games/game2/Game2Screen';
import Game3Screen from '../games/game3/Game3Screen';
import Game4Screen from '../games/game4/Game4Screen';
import Game5Screen from '../games/game5/Game5Screen';
import Game6Screen from '../games/game6/Game6Screen';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export default function GameScreen({ navigation, route }: Props) {
  const { coin, difficulty, gameId = 'game1', mode = 'cpu', coin2 } = route.params;
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    logEvent('game_start', { gameId, difficulty, mode });
  }, [gameId, difficulty]);

  const handleGameEnd = (result: 'player' | 'cpu' | 'draw' | 'timeout') => {
    const duration = Date.now() - startTime.current;
    logEvent('game_end', { gameId, result, duration });
    navigation.replace('Result', { result, coin, mode, gameId, difficulty });
  };

  const handleBack = () => navigation.goBack();

  switch (gameId) {
    case 'game2':
      return (
        <Game2Screen
          playerCoin={coin}
          difficulty={difficulty}
          onGameEnd={handleGameEnd}
          onBack={handleBack}
        />
      );
    case 'game3':
      return (
        <Game3Screen
          coin={coin}
          difficulty={difficulty}
          onGameEnd={handleGameEnd}
          onBack={handleBack}
        />
      );
    case 'game4':
      return (
        <Game4Screen
          difficulty={difficulty}
          onExit={handleBack}
        />
      );
    case 'game5':
      return (
        <Game5Screen
          difficulty={difficulty}
          onBack={handleBack}
        />
      );
    case 'game6':
      return <Game6Screen onBack={handleBack} />;
    case 'game1':
    default:
      // Game1 reads params from navigation route
      return <Game1Screen mode={mode === 'local' ? 'local' : 'cpu'} coin2={coin2} />;
  }
}
