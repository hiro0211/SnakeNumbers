import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Vibration, Animated } from "react-native";
import {
  GameState,
  Direction,
  Position,
  NumberItem,
  BonusItem,
  Obstacle,
  GameStats,
  Achievement,
  CellInfo,
  SnakeSkin,
} from "../types/game";
import { GRID_SIZE, SNAKE_SKINS, ACHIEVEMENTS } from "../constants/game";

export const useGameLogic = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 8, y: 8 }]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [speed, setSpeed] = useState(200);
  const [highScore, setHighScore] = useState(0);
  const [bonusItems, setBonusItems] = useState<BonusItem[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState(1);
  const [multiplierDuration, setMultiplierDuration] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalScore: 0,
    highScore: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    totalNumbersEaten: 0,
    longestSnake: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [currentSkinId, setCurrentSkinId] = useState("default");
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(
    null
  );
  const [level, setLevel] = useState(1);
  const [showGameOver, setShowGameOver] = useState(false);

  // アニメーション
  const achievementOpacity = useRef(new Animated.Value(0)).current;

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<Direction>("RIGHT");
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverHandled = useRef(false);

  // refを使って最新の状態を参照
  const numbersRef = useRef<NumberItem[]>([]);
  const bonusItemsRef = useRef<BonusItem[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextNumberRef = useRef(1);
  const scoreRef = useRef(0);

  // 現在のスキンを取得
  const currentSkin = useMemo(
    () =>
      SNAKE_SKINS.find((skin) => skin.id === currentSkinId) || SNAKE_SKINS[0],
    [currentSkinId]
  );

  // レベル計算
  const calculateLevel = useCallback((score: number) => {
    return Math.floor(score / 500) + 1;
  }, []);

  // レベルに応じた数字ブロック数を計算
  const getNumberBlockCount = useCallback((currentLevel: number) => {
    if (currentLevel <= 3) {
      return Math.floor(Math.random() * 2) + 3;
    } else if (currentLevel <= 6) {
      return Math.floor(Math.random() * 2) + 4;
    } else if (currentLevel <= 10) {
      return Math.floor(Math.random() * 2) + 5;
    } else if (currentLevel <= 15) {
      return Math.floor(Math.random() * 2) + 6;
    } else if (currentLevel <= 20) {
      return Math.floor(Math.random() * 2) + 7;
    } else if (currentLevel <= 30) {
      return Math.floor(Math.random() * 2) + 8;
    } else {
      return Math.floor(Math.random() * 2) + 9;
    }
  }, []);

  // グリッドの高速検索用マップ
  const gridMap = useMemo(() => {
    const map: { [key: string]: CellInfo } = {};

    // すべてのセルを空として初期化
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        map[`${x},${y}`] = { type: "empty" };
      }
    }

    // スネークの位置を設定
    snake.forEach((segment, index) => {
      const key = `${segment.x},${segment.y}`;
      map[key] = {
        type: index === 0 ? "snakeHead" : "snakeBody",
      };
    });

    // 数字の位置を設定
    numbers.forEach((numberItem) => {
      const key = `${numberItem.position.x},${numberItem.position.y}`;
      let cellType: CellInfo["type"] = "number";

      if (numberItem.isPoisonous) {
        cellType = "poisonousNumber";
      } else if (numberItem.isTimeLimited) {
        cellType = "timeLimitedNumber";
      } else if (numberItem.value === nextNumber) {
        cellType = "targetNumber";
      }

      map[key] = {
        type: cellType,
        value: numberItem.value,
        isTarget: numberItem.value === nextNumber,
        timeLeft: numberItem.timeLeft,
        isPoisonous: numberItem.isPoisonous,
      };
    });

    // ボーナスアイテムの位置を設定
    bonusItems.forEach((item) => {
      const key = `${item.position.x},${item.position.y}`;
      map[key] = {
        type: "bonus",
        bonusType: item.type,
      };
    });

    // 障害物の位置を設定
    obstacles.forEach((obstacle) => {
      const key = `${obstacle.position.x},${obstacle.position.y}`;
      map[key] = {
        type: "obstacle",
      };
    });

    return map;
  }, [snake, numbers, nextNumber, bonusItems, obstacles]);

  return {
    // State
    snake,
    direction,
    numbers,
    nextNumber,
    score,
    gameState,
    speed,
    highScore,
    bonusItems,
    obstacles,
    scoreMultiplier,
    multiplierDuration,
    isFrozen,
    currentStreak,
    bestStreak,
    gameStats,
    achievements,
    currentSkinId,
    showAchievement,
    level,
    showGameOver,
    achievementOpacity,
    currentSkin,
    gridMap,

    // Methods
    calculateLevel,
    getNumberBlockCount,
    setDirection,
    setGameState,
    setShowGameOver,
    setCurrentSkinId,

    // Refs
    directionRef,
    gameLoopRef,
    timeUpdateRef,
    gameOverHandled,
    numbersRef,
    bonusItemsRef,
    obstaclesRef,
    nextNumberRef,
    scoreRef,
  };
};
