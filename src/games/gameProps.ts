import { CoinType, Difficulty } from '../game/types';

export interface GameScreenProps {
  coin: CoinType;
  difficulty: Difficulty;
  onGameEnd: (result: 'player' | 'cpu' | 'draw' | 'timeout') => void;
  onBack: () => void;
}
