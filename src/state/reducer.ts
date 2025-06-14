import {
  GameState,
  GameStats,
  Achievement,
  Position,
  Direction,
  NumberItem,
  BonusItem,
  Obstacle,
} from "@/types/game";
import { Action } from "@/state/actions";
import { ACHIEVEMENTS } from "@/constants/game";

export interface AppState {
  snake: Position[];
  direction: Direction;
  numbers: NumberItem[];
  nextNumber: number;
  score: number;
  gameState: GameState;
  speed: number;
  highScore: number;
  bonusItems: BonusItem[];
  obstacles: Obstacle[];
  scoreMultiplier: number;
  multiplierDuration: number;
  isFrozen: boolean;
  currentStreak: number;
  bestStreak: number;
  gameStats: GameStats;
  achievements: Achievement[];
  currentSkinId: string;
  level: number;
  showGameOver: boolean;
  showAchievement: Achievement | null;
}

export const initialState: AppState = {
  snake: [{ x: 8, y: 8 }],
  direction: "RIGHT",
  numbers: [],
  nextNumber: 1,
  score: 0,
  gameState: "playing",
  speed: 200,
  highScore: 0,
  bonusItems: [],
  obstacles: [],
  scoreMultiplier: 1,
  multiplierDuration: 0,
  isFrozen: false,
  currentStreak: 0,
  bestStreak: 0,
  gameStats: {
    totalScore: 0,
    highScore: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    totalNumbersEaten: 0,
    longestSnake: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  achievements: ACHIEVEMENTS,
  currentSkinId: "default",
  level: 1,
  showGameOver: false,
  showAchievement: null,
};

export function gameReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "MOVE_SNAKE": {
      // このロジックはフック側に移動
      return state;
    }
    case "SET_DIRECTION":
      return { ...state, direction: action.payload };
    case "INITIALIZE_GAME":
      return {
        ...initialState,
        highScore: state.highScore,
        bestStreak: state.bestStreak,
        gameStats: state.gameStats,
        achievements: state.achievements,
        currentSkinId: state.currentSkinId,
        snake: action.payload.initialSnake,
        numbers: action.payload.numbers,
        obstacles: action.payload.obstacles,
      };
    case "EAT_NUMBER":
      return {
        ...state,
        snake: action.payload.newSnake,
        score: action.payload.newScore,
        nextNumber: action.payload.newNextNumber,
        numbers: action.payload.newNumbers,
        currentStreak: action.payload.newStreak,
        speed:
          state.score % 500 === 0 && state.speed > 50
            ? state.speed - 20
            : state.speed,
      };
    case "EAT_POISON":
      return { ...state, gameState: "gameOver" };
    case "EAT_BONUS": {
      let newState = { ...state, bonusItems: action.payload.newBonuses };
      switch (action.payload.bonus.type) {
        case "SCORE_MULTIPLIER":
          newState.scoreMultiplier = 2;
          newState.multiplierDuration = 5;
          break;
        case "TIME_FREEZE":
          newState.isFrozen = true;
          break;
        case "SHRINK":
          newState.snake = state.snake.slice(
            0,
            Math.max(1, Math.ceil(state.snake.length / 2))
          );
          break;
      }
      return newState;
    }
    case "GAME_OVER":
      return {
        ...state,
        gameState: "gameOver",
        gameStats: action.payload.newStats,
        achievements: action.payload.newAchievements,
        highScore: action.payload.newHighScore,
        bestStreak: Math.max(state.bestStreak, state.currentStreak),
      };
    case "PAUSE":
      return { ...state, gameState: "paused" };
    case "RESUME":
      return { ...state, gameState: "playing" };
    case "LOAD_GAME_DATA":
      return {
        ...state,
        gameStats: action.payload.stats,
        highScore: action.payload.stats.highScore,
        bestStreak: action.payload.stats.bestStreak,
        achievements: action.payload.achievements,
        currentSkinId: action.payload.skinId,
        level: action.payload.level,
      };
    case "CHANGE_SKIN":
      return { ...state, currentSkinId: action.payload };
    case "LEVEL_UP":
      return {
        ...state,
        level: action.payload.newLevel,
        obstacles: action.payload.newObstacles,
      };
    case "SET_FROZEN":
      return { ...state, isFrozen: action.payload };
    case "DECREMENT_MULTIPLIER_DURATION":
      return {
        ...state,
        multiplierDuration: Math.max(0, state.multiplierDuration - 1),
        scoreMultiplier:
          state.multiplierDuration - 1 <= 0 ? 1 : state.scoreMultiplier,
      };
    case "RESET_STREAK":
      return { ...state, currentStreak: 0 };
    case "SET_SHOW_GAME_OVER":
      return { ...state, showGameOver: action.payload };
    case "SET_NUMBERS":
      return { ...state, numbers: action.payload };
    default:
      return state;
  }
}
