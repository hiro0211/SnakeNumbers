// ゲームの状態
export type GameState = "playing" | "paused" | "gameOver";

// 方向
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

// 座標
export type Position = {
  x: number;
  y: number;
};

// 数字アイテム
export type NumberItem = {
  position: Position;
  value: number;
  isTimeLimited?: boolean;
  timeLeft?: number;
  isPoisonous?: boolean;
};

// ボーナスアイテムの種類
export type BonusItemType = "SCORE_MULTIPLIER" | "TIME_FREEZE" | "SHRINK";

// ボーナスアイテム
export type BonusItem = {
  position: Position;
  type: BonusItemType;
};

// 障害物
export type Obstacle = {
  position: Position;
};

// アチーブメント
export type Achievement = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  condition: (stats: GameStats, score: number, snakeLength: number) => boolean;
};

// ゲーム統計
export type GameStats = {
  totalScore: number;
  highScore: number;
  gamesPlayed: number;
  perfectGames: number; // 9までミスなく到達した回数
  totalNumbersEaten: number;
  longestSnake: number;
  currentStreak: number;
  bestStreak: number;
};

// スネークスキン
export type SnakeSkin = {
  id: string;
  name: string;
  unlockLevel: number;
  headColor: string;
  bodyColor: string;
  fontColor: string;
};

// セルのタイプ
export type CellInfo =
  | { type: "empty" }
  | { type: "snakeHead" }
  | { type: "snakeBody" }
  | {
      type: "number";
      value: number;
      isTarget: boolean;
      timeLeft?: number;
      isPoisonous?: boolean;
    }
  | {
      type: "targetNumber";
      value: number;
      isTarget: boolean;
      timeLeft?: number;
      isPoisonous?: boolean;
    }
  | {
      type: "timeLimitedNumber";
      value: number;
      isTarget: boolean;
      timeLeft?: number;
      isPoisonous?: boolean;
    }
  | {
      type: "poisonousNumber";
      value: number;
      isTarget: boolean;
      timeLeft?: number;
      isPoisonous?: boolean;
    }
  | { type: "bonus"; bonusType: BonusItemType }
  | { type: "obstacle" };
