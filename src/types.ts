export interface Question {
  id: string;
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface GameStats {
  xp: number;
  coins: number;
  streak: number;
  lives: number;
  totalCorrect: number;
  totalAnswered: number;
  categoryStats: Record<string, { correct: number; total: number }>;
}

export type Theme = 'default' | 'space' | 'jungle';
export type Avatar = 'mario' | 'robot' | 'ninja' | 'animal';

