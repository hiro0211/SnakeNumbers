import {
  Direction,
  GameState,
  NumberItem,
  Obstacle,
  Position,
  SnakeSkin,
  BonusItem,
  GameStats,
  Achievement,
} from "@/types/game";

export type Action =
  | { type: "MOVE_SNAKE" }
  | { type: "SET_DIRECTION"; payload: Direction }
  | { type: "SET_GAME_STATE"; payload: GameState }
  | {
      type: "INITIALIZE_GAME";
      payload: {
        initialSnake: Position[];
        numbers: NumberItem[];
        obstacles: Obstacle[];
      };
    }
  | { type: "SET_NUMBERS"; payload: NumberItem[] }
  | {
      type: "EAT_NUMBER";
      payload: {
        newSnake: Position[];
        newScore: number;
        newNextNumber: number;
        newNumbers: NumberItem[];
        newStreak: number;
      };
    }
  | { type: "EAT_POISON" }
  | {
      type: "EAT_BONUS";
      payload: { bonus: BonusItem; newBonuses: BonusItem[] };
    }
  | { type: "SHRINK_SNAKE" }
  | { type: "UPDATE_TIMER" }
  | {
      type: "GAME_OVER";
      payload: {
        newStats: GameStats;
        newAchievements: Achievement[];
        newHighScore: number;
      };
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | {
      type: "LOAD_GAME_DATA";
      payload: {
        stats: GameStats;
        achievements: Achievement[];
        skinId: string;
        level: number;
      };
    }
  | { type: "CHANGE_SKIN"; payload: string }
  | {
      type: "LEVEL_UP";
      payload: { newLevel: number; newObstacles: Obstacle[] };
    }
  | { type: "SET_FROZEN"; payload: boolean }
  | { type: "DECREMENT_MULTIPLIER_DURATION" }
  | { type: "RESET_STREAK" }
  | { type: "SET_HIGH_SCORE"; payload: number }
  | { type: "SET_BEST_STREAK"; payload: number }
  | { type: "SET_GAME_STATS"; payload: GameStats }
  | { type: "SET_ACHIEVEMENTS"; payload: Achievement[] }
  | { type: "SHOW_ACHIEVEMENT"; payload: Achievement | null }
  | { type: "SET_SHOW_GAME_OVER"; payload: boolean };
