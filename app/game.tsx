import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Dimensions,
  PanResponder,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  ViewStyle,
  Animated,
} from "react-native";
// import AdBanner from "@/components/AdBanner";
// import useInterstitialAd from "@/hooks/useInterstitialAd";

const { width, height } = Dimensions.get("window");
const GRID_SIZE = 16;
const MARGIN = 30; // 画面端の余白
const AVAILABLE_SIZE = Math.min(width - MARGIN * 2, height * 0.8); // ヘッダーとUIを除いた利用可能サイズ
const CELL_SIZE = AVAILABLE_SIZE / GRID_SIZE;

// ゲームの状態
type GameState = "playing" | "paused" | "gameOver" | "howToPlay";

// 方向
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

// 座標
interface Position {
  x: number;
  y: number;
}

// 数字アイテム
interface NumberItem {
  position: Position;
  value: number;
  isTimeLimited?: boolean;
  timeLeft?: number;
  isPoisonous?: boolean;
}

// ボーナスアイテムの種類
type BonusItemType = "SCORE_MULTIPLIER" | "TIME_FREEZE" | "SHRINK";

// ボーナスアイテム
interface BonusItem {
  position: Position;
  type: BonusItemType;
}

// 障害物
interface Obstacle {
  position: Position;
  isMoving?: boolean;
  direction?: Direction;
}

// アチーブメント
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (gameStats: GameStats) => boolean;
  unlocked: boolean;
}

// ゲーム統計
interface GameStats {
  totalScore: number;
  highScore: number;
  gamesPlayed: number;
  perfectGames: number;
  totalNumbersEaten: number;
  longestSnake: number;
  currentStreak: number;
  bestStreak: number;
}

// スネークスキン
interface SnakeSkin {
  id: string;
  name: string;
  headEmoji: string;
  bodyColor: string;
  unlockLevel: number;
}

// セルのタイプ
type CellType =
  | "empty"
  | "snakeHead"
  | "snakeBody"
  | "number"
  | "targetNumber"
  | "timeLimitedNumber"
  | "poisonousNumber"
  | "bonus"
  | "obstacle";

// グリッドセルの情報
interface CellInfo {
  type: CellType;
  value?: number;
  isTarget?: boolean;
  bonusType?: BonusItemType;
  timeLeft?: number;
  isPoisonous?: boolean;
}

const snakeHeadStyle: ViewStyle = { backgroundColor: "#4ade80" };
const snakeBodyStyle: ViewStyle = { backgroundColor: "#22c55e" };
const numberStyle: ViewStyle = {
  backgroundColor: "#374151",
  borderWidth: 1,
  borderColor: "#6b7280",
};
const nextNumberStyle: ViewStyle = {
  backgroundColor: "#fbbf24",
  borderWidth: 2,
  borderColor: "#f59e0b",
};

// スネークスキンデータ
const SNAKE_SKINS: SnakeSkin[] = [
  {
    id: "default",
    name: "Classic",
    headEmoji: "🐍",
    bodyColor: "#22c55e",
    unlockLevel: 1,
  },
  {
    id: "fire",
    name: "Fire Snake",
    headEmoji: "🔥",
    bodyColor: "#ef4444",
    unlockLevel: 5,
  },
  {
    id: "ice",
    name: "Ice Snake",
    headEmoji: "❄️",
    bodyColor: "#3b82f6",
    unlockLevel: 10,
  },
  {
    id: "gold",
    name: "Golden Snake",
    headEmoji: "👑",
    bodyColor: "#eab308",
    unlockLevel: 15,
  },
  {
    id: "rainbow",
    name: "Rainbow Snake",
    headEmoji: "🌈",
    bodyColor: "#8b5cf6",
    unlockLevel: 25,
  },
  {
    id: "dragon",
    name: "Dragon",
    headEmoji: "🐲",
    bodyColor: "#059669",
    unlockLevel: 50,
  },
];

// アチーブメントデータ
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_game",
    name: "First Game",
    description: "Play your first game",
    icon: "🎮",
    condition: (stats) => stats.gamesPlayed >= 1,
    unlocked: false,
  },
  {
    id: "score_100",
    name: "Score 100",
    description: "Get over 100 points",
    icon: "💯",
    condition: (stats) => stats.highScore >= 100,
    unlocked: false,
  },
  {
    id: "score_500",
    name: "Score 500",
    description: "Get over 500 points",
    icon: "⭐",
    condition: (stats) => stats.highScore >= 500,
    unlocked: false,
  },
  {
    id: "streak_10",
    name: "Streak Master",
    description: "Get a streak of 10",
    icon: "🔥",
    condition: (stats) => stats.bestStreak >= 10,
    unlocked: false,
  },
  {
    id: "long_snake",
    name: "Giant Snake",
    description: "Reach a snake length of 20",
    icon: "🐲",
    condition: (stats) => stats.longestSnake >= 20,
    unlocked: false,
  },
];

// メモ化されたセルコンポーネント
const GameCell = React.memo(
  ({
    cellInfo,
    cellStyle,
    x,
    y,
    snakeSkin,
  }: {
    cellInfo: CellInfo;
    cellStyle: StyleProp<ViewStyle>;
    x: number;
    y: number;
    snakeSkin: SnakeSkin;
  }) => {
    let content = null;
    let style = [styles.cell];

    switch (cellInfo.type) {
      case "snakeHead":
        style = [styles.cell, { backgroundColor: snakeSkin.bodyColor }];
        content = (
          <Text style={styles.snakeHeadText}>{snakeSkin.headEmoji}</Text>
        );
        break;
      case "snakeBody":
        style = [styles.cell, { backgroundColor: snakeSkin.bodyColor }];
        break;
      case "targetNumber":
        style = [
          styles.cell,
          {
            backgroundColor: "#fbbf24",
            borderWidth: 2,
            borderColor: "#f59e0b",
          },
        ];
        content = <Text style={styles.numberText}>{cellInfo.value}</Text>;
        break;
      case "timeLimitedNumber":
        const isBlinking = cellInfo.timeLeft && cellInfo.timeLeft <= 3;
        style = [
          styles.cell,
          {
            backgroundColor: cellInfo.isTarget
              ? isBlinking
                ? "#dc2626"
                : "#fbbf24"
              : isBlinking
              ? "#7f1d1d"
              : "#374151",
            borderWidth: cellInfo.isTarget ? 2 : 1,
            borderColor: cellInfo.isTarget
              ? isBlinking
                ? "#ef4444"
                : "#f59e0b"
              : "#6b7280",
          },
        ];
        content = <Text style={styles.numberText}>{cellInfo.value}</Text>;
        break;
      case "poisonousNumber":
        style = [
          styles.cell,
          {
            backgroundColor: "#dc2626",
            borderWidth: 2,
            borderColor: "#ef4444",
          },
        ];
        content = <Text style={styles.poisonText}>💀</Text>;
        break;
      case "number":
        style = [
          styles.cell,
          {
            backgroundColor: "#374151",
            borderWidth: 1,
            borderColor: "#6b7280",
          },
        ];
        content = <Text style={styles.numberText}>{cellInfo.value}</Text>;
        break;
      case "bonus":
        let bonusContent = null;
        switch (cellInfo.bonusType) {
          case "SCORE_MULTIPLIER":
            bonusContent = "⭐";
            break;
          case "TIME_FREEZE":
            bonusContent = "❄️";
            break;
          case "SHRINK":
            bonusContent = "✂️";
            break;
        }
        style = [styles.cell, { backgroundColor: "#ff69b4" }];
        content = <Text style={styles.bonusText}>{bonusContent}</Text>;
        break;
      case "obstacle":
        style = [
          styles.cell,
          {
            backgroundColor: "#4b5563",
            borderColor: "#6b7280",
            borderWidth: 2,
          },
        ];
        content = <Text style={styles.obstacleText}>🧱</Text>;
        break;
      default:
        style = [styles.cell];
    }

    return <View style={style as StyleProp<ViewStyle>}>{content}</View>;
  }
);

export default function GameScreen() {
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
  const [comboMultiplier, setComboMultiplier] = useState(1);
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
    return Math.floor(score / 500) + 1; // 500点ごとにレベルアップ
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
      let cellType: CellType = "number";

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

  // インタースティシャル広告hook（一時的に無効化）
  // const { showAd: showInterstitialAd } = useInterstitialAd();

  // refを更新
  useEffect(() => {
    numbersRef.current = numbers;
  }, [numbers]);

  useEffect(() => {
    bonusItemsRef.current = bonusItems;
  }, [bonusItems]);

  useEffect(() => {
    nextNumberRef.current = nextNumber;
  }, [nextNumber]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  // スコア倍率をリセット
  useEffect(() => {
    if (multiplierDuration <= 0) {
      setScoreMultiplier(1);
    }
  }, [multiplierDuration]);

  // ハイスコア読み込み
  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    initializeGame();
  }, [loadGameData, initializeGame]);

  const loadGameData = useCallback(async () => {
    try {
      const statsData = await AsyncStorage.getItem("numberSnakeStats");
      if (statsData) {
        const stats = JSON.parse(statsData);
        setGameStats(stats);
        setHighScore(stats.highScore);
        setBestStreak(stats.bestStreak);
        setLevel(calculateLevel(stats.highScore)); // ハイスコアからレベルを計算
      }

      const achievementsData = await AsyncStorage.getItem(
        "numberSnakeAchievements"
      );
      if (achievementsData) {
        const unlockedAchievements = JSON.parse(achievementsData);
        // ロードした達成状況をマージ
        setAchievements((prev) =>
          prev.map((ach) => ({
            ...ach,
            unlocked:
              unlockedAchievements.find((ua) => ua.id === ach.id)?.unlocked ||
              false,
          }))
        );
      }

      const skinData = await AsyncStorage.getItem("numberSnakeCurrentSkin");
      if (skinData) {
        setCurrentSkinId(skinData);
      }
    } catch (error) {
      console.error("Error loading game data:", error);
    }
  }, [calculateLevel]);

  const saveGameData = useCallback(
    async (
      newStats: GameStats,
      newAchievements: Achievement[],
      skinId: string
    ) => {
      try {
        await AsyncStorage.setItem(
          "numberSnakeStats",
          JSON.stringify(newStats)
        );
        await AsyncStorage.setItem(
          "numberSnakeAchievements",
          JSON.stringify(newAchievements.filter((a) => a.unlocked))
        );
        await AsyncStorage.setItem("numberSnakeCurrentSkin", skinId);
      } catch (error) {
        console.error("Error saving game data:", error);
      }
    },
    []
  );

  const initializeGame = useCallback(() => {
    const initialSnake = [{ x: 8, y: 8 }];
    setSnake(initialSnake);
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setNextNumber(1);
    setScore(0);
    setSpeed(200);
    setObstacles([]);
    generateNumbers(initialSnake);
    setBonusItems([]);
    setScoreMultiplier(1);
    setMultiplierDuration(0);
    setIsFrozen(false);
    setCurrentStreak(0);
    setComboMultiplier(1);
    gameOverHandled.current = false; // ゲーム開始時にフラグをリセット
  }, []);

  const moveSnake = useCallback(() => {
    setSnake((currentSnake) => {
      const newSnake = [...currentSnake];
      const head = { ...newSnake[0] };

      // 方向に基づいて頭を移動
      switch (directionRef.current) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      // 壁との衝突チェック
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        setGameState("gameOver");
        return currentSnake;
      }

      // 障害物との衝突チェック
      const hitObstacle = obstaclesRef.current.find(
        (obs) => obs.position.x === head.x && obs.position.y === head.y
      );

      if (hitObstacle) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.vibrate(500);
        setGameState("gameOver");
        return currentSnake;
      }

      // 自分自身との衝突チェック
      if (
        newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
      ) {
        setGameState("gameOver");
        return currentSnake;
      }

      newSnake.unshift(head);

      // ボーナスアイテムとの衝突チェック
      const eatenBonus = bonusItemsRef.current.find(
        (b) => b.position.x === head.x && b.position.y === head.y
      );

      if (eatenBonus) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBonusItems((items) =>
          items.filter(
            (b) =>
              !(
                b.position.x === eatenBonus.position.x &&
                b.position.y === eatenBonus.position.y
              )
          )
        );

        switch (eatenBonus.type) {
          case "SCORE_MULTIPLIER":
            setScoreMultiplier(2);
            setMultiplierDuration(5); // 5回分
            break;
          case "TIME_FREEZE":
            setIsFrozen(true);
            setTimeout(() => setIsFrozen(false), 3000); // 3秒間フリーズ
            break;
          case "SHRINK":
            // 蛇の長さを半分にする（最低1）
            setSnake((s) => s.slice(0, Math.max(1, Math.ceil(s.length / 2))));
            break;
        }
      }

      // 数字との衝突チェック
      const eatenNumber = numbersRef.current.find(
        (num) => num.position.x === head.x && num.position.y === head.y
      );

      if (eatenNumber) {
        // 毒数字チェック
        if (eatenNumber.isPoisonous) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          Vibration.vibrate(500);
          setGameState("gameOver");
          return currentSnake;
        }

        if (eatenNumber.value === nextNumberRef.current) {
          // 正しい数字を食べた
          const newStreak = currentStreak + 1;
          setCurrentStreak(newStreak);

          // 連続ボーナス計算
          const streakBonus = Math.floor(newStreak / 5) + 1; // 5回ごとにボーナス+1
          const totalMultiplier = scoreMultiplier * streakBonus;

          const newScore =
            scoreRef.current + eatenNumber.value * 10 * totalMultiplier;
          setScore(newScore);

          // レベル更新と難易度調整
          const newLevel = calculateLevel(newScore);
          if (newLevel > level) {
            setLevel(newLevel);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // 新しいレベルで障害物を生成
            generateObstacles(newLevel, [
              ...newSnake,
              ...numbersRef.current.map((n) => n.position),
              ...bonusItemsRef.current.map((b) => b.position),
            ]);
          }

          // ベストストリーク更新
          if (newStreak > bestStreak) {
            setBestStreak(newStreak);
          }

          const currentEatenNumberValue = nextNumberRef.current; // 今食べた数字の値
          const targetNextNumberValue =
            currentEatenNumberValue === 9 ? 1 : currentEatenNumberValue + 1;
          setNextNumber(targetNextNumberValue); // 次の数字をセット (useEffectでnextNumberRef.currentも更新される)

          // スコア倍率処理
          if (multiplierDuration > 0) {
            setMultiplierDuration((d) => d - 1);
          }

          // 効果音とバイブレーション
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // 食べた数字を盤面から削除
          const filteredNumbers = numbersRef.current.filter(
            (num) => !(num.position.x === head.x && num.position.y === head.y)
          );

          let updatedNumbersList = [...filteredNumbers];

          // 次に取るべき数字 (targetNextNumberValue) が盤面に残っているか確認
          const isTargetNextNumberPresentOnBoard = updatedNumbersList.some(
            (num) => num.value === targetNextNumberValue
          );

          if (!isTargetNextNumberPresentOnBoard) {
            // 次に取るべき数字が盤面にない場合、それを追加する
            updatedNumbersList.push({
              position: getRandomEmptyPosition([
                ...newSnake, // 更新後のスネークの位置
                ...updatedNumbersList.map((n) => n.position), // 現在の数字リスト（追加前）
                ...obstaclesRef.current.map((o) => o.position), // 障害物の位置
              ]),
              value: targetNextNumberValue,
            });
          } else {
            // 次に取るべき数字が既に盤面にある場合、ランダムな数字を追加して盤面のアイテム数を維持
            const newNumberValue = Math.floor(Math.random() * 9) + 1;
            const isTimeLimited = newLevel >= 8 && Math.random() < 0.2; // 20%の確率
            const isPoisonous = newLevel >= 15 && Math.random() < 0.05; // 5%の確率

            updatedNumbersList.push({
              position: getRandomEmptyPosition([
                ...newSnake,
                ...updatedNumbersList.map((n) => n.position),
                ...obstaclesRef.current.map((o) => o.position),
              ]),
              value: newNumberValue,
              isTimeLimited,
              timeLeft: isTimeLimited ? 8 : undefined, // 8秒
              isPoisonous,
            });
          }

          setNumbers(updatedNumbersList);

          // ボーナスアイテム生成
          generateBonusItem([
            ...newSnake,
            ...updatedNumbersList.map((n) => n.position),
            ...bonusItemsRef.current.map((b) => b.position),
            ...obstaclesRef.current.map((o) => o.position),
          ]);

          // スピードアップ（500点ごと）
          if (newScore % 500 === 0 && speed > 50) {
            setSpeed((prev) => Math.max(prev - 20, 50));
          }

          // 蛇が伸びるので尻尾は削除しない
        } else {
          // 間違った数字を食べた
          setCurrentStreak(0); // ストリークリセット
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          Vibration.vibrate(500);
          setGameState("gameOver");
          return currentSnake;
        }
      } else {
        // 何も食べていない場合は尻尾を削除
        newSnake.pop();
      }

      return newSnake;
    });
  }, [
    speed,
    currentStreak,
    bestStreak,
    level,
    calculateLevel,
    generateObstacles,
  ]);

  // ゲームループ
  useEffect(() => {
    if (gameState === "playing" && !isFrozen) {
      gameLoopRef.current = setInterval(
        moveSnake,
        speed
      ) as unknown as NodeJS.Timeout;
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current as unknown as number);
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current as unknown as number);
      }
    };
  }, [gameState, speed, moveSnake, isFrozen]);

  const generateNumbers = useCallback(
    (currentSnake: Position[]) => {
      const newNumbers: NumberItem[] = [];
      const occupiedPositions = new Set(
        currentSnake.map((pos) => `${pos.x},${pos.y}`)
      );

      // 障害物の位置も追加
      obstaclesRef.current.forEach((obstacle) => {
        occupiedPositions.add(`${obstacle.position.x},${obstacle.position.y}`);
      });

      // 最初の数字として必ず1を含める
      let position: Position;
      let attempts = 0;

      do {
        position = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        attempts++;
      } while (
        occupiedPositions.has(`${position.x},${position.y}`) &&
        attempts < 100
      );

      if (attempts < 100) {
        newNumbers.push({
          position,
          value: 1,
        });
      }

      // 残りの2-4個の数字を生成
      const numCount = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < numCount; i++) {
        let position: Position;
        let attempts = 0;

        do {
          position = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
          };
          attempts++;
        } while (
          (occupiedPositions.has(`${position.x},${position.y}`) ||
            newNumbers.some(
              (num) =>
                num.position.x === position.x && num.position.y === position.y
            )) &&
          attempts < 100
        );

        if (attempts < 100) {
          const value = Math.floor(Math.random() * 9) + 1;
          const isTimeLimited = level >= 8 && Math.random() < 0.2; // 20%の確率
          const isPoisonous = level >= 15 && Math.random() < 0.05; // 5%の確率

          newNumbers.push({
            position,
            value,
            isTimeLimited,
            timeLeft: isTimeLimited ? 8 : undefined, // 8秒
            isPoisonous,
          });
        }
      }

      setNumbers(newNumbers);
    },
    [level]
  );

  const generateBonusItem = useCallback((occupied: Position[]) => {
    if (Math.random() < 0.75) return; // 25%の確率で生成

    // 既にボーナスアイテムが存在する場合は生成しない
    if (bonusItemsRef.current.length > 0) return;

    const bonusTypes: BonusItemType[] = [
      "SCORE_MULTIPLIER",
      "TIME_FREEZE",
      "SHRINK",
    ];
    const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
    const position = getRandomEmptyPosition(occupied);

    setBonusItems((items) => [...items, { position, type }]);
  }, []);

  const getRandomEmptyPosition = useCallback(
    (occupiedPositions: Position[]): Position => {
      const occupied = new Set(
        occupiedPositions.map((pos) => `${pos.x},${pos.y}`)
      );
      let position: Position;
      let attempts = 0;

      do {
        position = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        };
        attempts++;
      } while (occupied.has(`${position.x},${position.y}`) && attempts < 100);

      return position;
    },
    []
  );

  // ゲームオーバー処理
  useEffect(() => {
    if (gameState === "gameOver" && !gameOverHandled.current) {
      gameOverHandled.current = true;

      const handleGameOver = async () => {
        const finalScore = score;
        const newHighScore = Math.max(highScore, finalScore);

        const newStats: GameStats = {
          ...gameStats,
          highScore: newHighScore,
          gamesPlayed: gameStats.gamesPlayed + 1,
          totalNumbersEaten: gameStats.totalNumbersEaten + currentStreak,
          longestSnake: Math.max(gameStats.longestSnake, snake.length),
          bestStreak: Math.max(gameStats.bestStreak, currentStreak),
        };

        const newlyUnlocked: Achievement[] = [];
        const newAchievements = achievements.map((ach) => {
          if (!ach.unlocked && ach.condition(newStats)) {
            newlyUnlocked.push(ach);
            return { ...ach, unlocked: true };
          }
          return ach;
        });

        // Set state
        setHighScore(newHighScore);
        setGameStats(newStats);
        if (newlyUnlocked.length > 0) {
          setAchievements(newAchievements);
          setShowAchievement(newlyUnlocked[0]);
          Animated.sequence([
            Animated.timing(achievementOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.delay(2000),
            Animated.timing(achievementOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }),
          ]).start(() => setShowAchievement(null));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        // Save data
        await saveGameData(newStats, newAchievements, currentSkinId);

        // Show game over screen
        setTimeout(() => {
          setShowGameOver(true);
        }, 100);
      };

      handleGameOver();
    }
  }, [
    gameState,
    score,
    highScore,
    gameStats,
    currentStreak,
    snake,
    achievements,
    currentSkinId,
    initializeGame,
    saveGameData,
    bestStreak,
    achievementOpacity,
  ]);

  // スワイプ操作
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (evt, gestureState) => {
          const { dx, dy } = gestureState;
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);

          if (Math.max(absDx, absDy) < 30) return;

          if (absDx > absDy) {
            // 水平方向
            if (dx > 0 && directionRef.current !== "LEFT") {
              setDirection("RIGHT");
              directionRef.current = "RIGHT";
            } else if (dx < 0 && directionRef.current !== "RIGHT") {
              setDirection("LEFT");
              directionRef.current = "LEFT";
            }
          } else {
            // 垂直方向
            if (dy > 0 && directionRef.current !== "UP") {
              setDirection("DOWN");
              directionRef.current = "DOWN";
            } else if (dy < 0 && directionRef.current !== "DOWN") {
              setDirection("UP");
              directionRef.current = "UP";
            }
          }
        },
      }),
    []
  );

  const togglePause = useCallback(() => {
    setGameState((prev) => (prev === "playing" ? "paused" : "playing"));
  }, []);

  // 最適化されたグリッドレンダリング
  const renderGrid = useMemo(() => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const cellInfo = gridMap[key] || { type: "empty" };

        row.push(
          <GameCell
            key={key}
            cellInfo={cellInfo}
            cellStyle={styles.cell}
            x={x}
            y={y}
            snakeSkin={currentSkin}
          />
        );
      }
      grid.push(
        <View key={y} style={styles.row}>
          {row}
        </View>
      );
    }
    return grid;
  }, [gridMap, currentSkin]);

  const changeSkin = useCallback(
    (skinId: string) => {
      const skin = SNAKE_SKINS.find((s) => s.id === skinId);
      if (skin && level >= skin.unlockLevel) {
        setCurrentSkinId(skinId);
      }
    },
    [level]
  );

  // 時間制限数字の更新
  useEffect(() => {
    if (level >= 8 && gameState === "playing") {
      timeUpdateRef.current = setInterval(() => {
        setNumbers(
          (currentNumbers) =>
            currentNumbers
              .map((num) => {
                if (num.isTimeLimited && num.timeLeft && num.timeLeft > 0) {
                  const newTimeLeft = num.timeLeft - 1;
                  if (newTimeLeft <= 0) {
                    return null; // 削除対象
                  }
                  return { ...num, timeLeft: newTimeLeft };
                }
                return num;
              })
              .filter(Boolean) as NumberItem[]
        );
      }, 1000);
    } else {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    }

    return () => {
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, [level, gameState]);

  // 移動障害物の更新
  useEffect(() => {
    if (level >= 20 && gameState === "playing") {
      const moveObstaclesInterval = setInterval(() => {
        setObstacles((currentObstacles) =>
          currentObstacles.map((obstacle) => {
            if (!obstacle.isMoving || !obstacle.direction) return obstacle;

            const { x, y } = obstacle.position;
            let newX = x;
            let newY = y;
            let newDirection = obstacle.direction;

            // 方向に基づいて移動
            switch (obstacle.direction) {
              case "UP":
                newY = y - 1;
                break;
              case "DOWN":
                newY = y + 1;
                break;
              case "LEFT":
                newX = x - 1;
                break;
              case "RIGHT":
                newX = x + 1;
                break;
            }

            // 壁に当たったら方向転換
            if (
              newX < 0 ||
              newX >= GRID_SIZE ||
              newY < 0 ||
              newY >= GRID_SIZE
            ) {
              const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
              newDirection =
                directions[Math.floor(Math.random() * directions.length)];
              return { ...obstacle, direction: newDirection };
            }

            return {
              ...obstacle,
              position: { x: newX, y: newY },
              direction: newDirection,
            };
          })
        );
      }, 2000); // 2秒ごとに移動

      return () => clearInterval(moveObstaclesInterval);
    }
  }, [level, gameState]);

  const generateObstacles = useCallback(
    (level: number, occupiedPositions: Position[]) => {
      if (level < 3) return;

      const obstacleCount = Math.min(Math.floor((level - 1) / 2), 8); // 最大8個
      const newObstacles: Obstacle[] = [];
      const occupied = new Set(
        occupiedPositions.map((pos) => `${pos.x},${pos.y}`)
      );

      for (let i = 0; i < obstacleCount; i++) {
        let position: Position;
        let attempts = 0;

        do {
          position = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
          };
          attempts++;
        } while (
          (occupied.has(`${position.x},${position.y}`) ||
            newObstacles.some(
              (obs) =>
                obs.position.x === position.x && obs.position.y === position.y
            )) &&
          attempts < 100
        );

        if (attempts < 100) {
          const isMoving = level >= 20 && Math.random() < 0.3; // 30%の確率で移動
          const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

          newObstacles.push({
            position,
            isMoving,
            direction: isMoving
              ? directions[Math.floor(Math.random() * directions.length)]
              : undefined,
          });
          occupied.add(`${position.x},${position.y}`);
        }
      }

      setObstacles(newObstacles);
    },
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setGameState("howToPlay")}
            style={styles.helpButton}
          >
            <Text style={styles.helpButtonText}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePause} style={styles.pauseButton}>
            <Text style={styles.pauseButtonText}>
              {gameState === "paused" ? "▶️" : "⏸️"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Score Board */}
      <View style={styles.scoreBoard}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>High Score</Text>
          <Text style={styles.scoreValue}>{highScore}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Level</Text>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Streak</Text>
          <Text style={styles.streakText}>{currentStreak}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Next</Text>
          <Text style={styles.nextNumberDisplay}>{nextNumber}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Bonus</Text>
          <Text style={styles.bonusStatusText}>
            {scoreMultiplier > 1
              ? `x${scoreMultiplier} (${multiplierDuration})`
              : currentStreak >= 5
              ? `x${Math.floor(currentStreak / 5) + 1}`
              : isFrozen
              ? "❄️"
              : "-"}
          </Text>
        </View>
      </View>

      {/* スキン選択 */}
      <View style={styles.skinSelector}>
        {SNAKE_SKINS.slice(0, 4).map((skin) => (
          <TouchableOpacity
            key={skin.id}
            style={[
              styles.skinButton,
              currentSkinId === skin.id && styles.selectedSkin,
              level < skin.unlockLevel && styles.lockedSkin,
            ]}
            onPress={() => changeSkin(skin.id)}
            disabled={level < skin.unlockLevel}
          >
            <Text style={styles.skinEmoji}>{skin.headEmoji}</Text>
            {level < skin.unlockLevel && (
              <Text style={styles.lockText}>🔒</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* バナー広告（一時的に無効化） */}
      {/* <AdBanner /> */}

      {/* Game Grid */}
      <View style={styles.gameContainer} {...panResponder.panHandlers}>
        <View style={styles.grid}>{renderGrid}</View>

        {/* タップ操作エリア */}
        <View style={styles.tapControls}>
          <TouchableOpacity
            style={[styles.tapArea, styles.tapUp]}
            onPress={() => {
              if (directionRef.current !== "DOWN") {
                setDirection("UP");
                directionRef.current = "UP";
              }
            }}
          />
          <View style={styles.tapMiddleRow}>
            <TouchableOpacity
              style={[styles.tapArea, styles.tapLeft]}
              onPress={() => {
                if (directionRef.current !== "RIGHT") {
                  setDirection("LEFT");
                  directionRef.current = "LEFT";
                }
              }}
            />
            <TouchableOpacity
              style={[styles.tapArea, styles.tapRight]}
              onPress={() => {
                if (directionRef.current !== "LEFT") {
                  setDirection("RIGHT");
                  directionRef.current = "RIGHT";
                }
              }}
            />
          </View>
          <TouchableOpacity
            style={[styles.tapArea, styles.tapDown]}
            onPress={() => {
              if (directionRef.current !== "UP") {
                setDirection("DOWN");
                directionRef.current = "DOWN";
              }
            }}
          />
        </View>
      </View>

      {/* Achievement Notification */}
      {showAchievement && (
        <Animated.View
          style={[
            styles.achievementNotification,
            { opacity: achievementOpacity },
          ]}
        >
          <Text style={styles.achievementIcon}>{showAchievement.icon}</Text>
          <View style={styles.achievementTextContainer}>
            <Text style={styles.achievementTitle}>Achievement Unlocked!</Text>
            <Text style={styles.achievementName}>{showAchievement.name}</Text>
            <Text style={styles.achievementDescription}>
              {showAchievement.description}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Pause Overlay */}
      {gameState === "paused" && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseText}>Paused</Text>
          <TouchableOpacity onPress={togglePause} style={styles.resumeButton}>
            <Text style={styles.resumeButtonText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: "#94a3b8",
    fontSize: 16,
  },
  pauseButton: {
    padding: 10,
  },
  pauseButtonText: {
    fontSize: 20,
  },
  scoreBoard: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 10,
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 2,
  },
  scoreValue: {
    color: "#4ade80",
    fontSize: 18,
    fontWeight: "bold",
  },
  nextNumberDisplay: {
    color: "#fbbf24",
    fontSize: 24,
    fontWeight: "bold",
  },
  bonusStatusText: {
    color: "#ff69b4",
    fontSize: 18,
    fontWeight: "bold",
  },
  gameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: MARGIN,
  },
  grid: {
    backgroundColor: "#16213e",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: "#1a1a2e",
    margin: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  snakeHeadText: {
    fontSize: CELL_SIZE * 0.5,
  },
  numberText: {
    color: "#e5e7eb",
    fontSize: CELL_SIZE * 0.6,
    fontWeight: "bold",
  },
  bonusText: {
    fontSize: CELL_SIZE * 0.6,
  },
  poisonText: {
    fontSize: CELL_SIZE * 0.5,
  },
  obstacleText: {
    fontSize: CELL_SIZE * 0.5,
  },
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseText: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 30,
  },
  resumeButton: {
    backgroundColor: "#4ade80",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  resumeButtonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
  tapControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    alignItems: "center",
  },
  tapArea: {
    backgroundColor: "transparent",
  },
  tapUp: {
    width: "100%",
    height: "25%",
  },
  tapDown: {
    width: "100%",
    height: "25%",
  },
  tapMiddleRow: {
    flexDirection: "row",
    width: "100%",
    height: "50%",
  },
  tapLeft: {
    width: "50%",
    height: "100%",
  },
  tapRight: {
    width: "50%",
    height: "100%",
  },
  levelText: {
    color: "#8b5cf6",
    fontSize: 18,
    fontWeight: "bold",
  },
  streakText: {
    color: "#f59e0b",
    fontSize: 18,
    fontWeight: "bold",
  },
  skinSelector: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 10,
  },
  skinButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedSkin: {
    borderColor: "#4ade80",
  },
  lockedSkin: {
    opacity: 0.5,
  },
  skinEmoji: {
    fontSize: 20,
  },
  lockText: {
    position: "absolute",
    fontSize: 12,
  },
  achievementNotification: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "#1f2937",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#fbbf24",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  achievementTextContainer: {
    flex: 1,
  },
  achievementTitle: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "bold",
  },
  achievementName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
  },
  achievementDescription: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 2,
  },
});
