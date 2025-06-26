import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
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
import AdBanner from "@/components/AdBanner";
import useInterstitialAd from "@/hooks/useInterstitialAd";
import useRewardedAd from "@/hooks/useRewardedAd";

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

// 高度にメモ化されたセルコンポーネント
const GameCell = memo(
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
    const memoizedStyle = useMemo(() => {
      let style = [styles.cell];

      switch (cellInfo.type) {
        case "snakeHead":
          return [styles.cell, { backgroundColor: snakeSkin.bodyColor }];
        case "snakeBody":
          return [styles.cell, { backgroundColor: snakeSkin.bodyColor }];
        case "targetNumber":
          return [
            styles.cell,
            {
              backgroundColor: "#fbbf24",
              borderWidth: 2,
              borderColor: "#f59e0b",
            },
          ];
        case "timeLimitedNumber":
          const isBlinking = cellInfo.timeLeft && cellInfo.timeLeft <= 3;
          return [
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
        case "poisonousNumber":
          return [
            styles.cell,
            {
              backgroundColor: "#dc2626",
              borderWidth: 2,
              borderColor: "#ef4444",
            },
          ];
        case "number":
          return [
            styles.cell,
            {
              backgroundColor: "#374151",
              borderWidth: 1,
              borderColor: "#6b7280",
            },
          ];
        case "bonus":
          return [styles.cell, { backgroundColor: "#ff69b4" }];
        case "obstacle":
          return [
            styles.cell,
            {
              backgroundColor: "#4b5563",
              borderColor: "#6b7280",
              borderWidth: 2,
            },
          ];
        default:
          return [styles.cell];
      }
    }, [
      cellInfo.type,
      cellInfo.isTarget,
      cellInfo.timeLeft,
      snakeSkin.bodyColor,
    ]);

    const memoizedContent = useMemo(() => {
      switch (cellInfo.type) {
        case "snakeHead":
          return (
            <Text style={styles.snakeHeadText}>{snakeSkin.headEmoji}</Text>
          );
        case "snakeBody":
          return null;
        case "targetNumber":
        case "timeLimitedNumber":
        case "number":
          return <Text style={styles.numberText}>{cellInfo.value}</Text>;
        case "poisonousNumber":
          return <Text style={styles.poisonText}>💀</Text>;
        case "bonus":
          switch (cellInfo.bonusType) {
            case "SCORE_MULTIPLIER":
              return <Text style={styles.bonusText}>⭐</Text>;
            case "TIME_FREEZE":
              return <Text style={styles.bonusText}>❄️</Text>;
            case "SHRINK":
              return <Text style={styles.bonusText}>✂️</Text>;
            default:
              return null;
          }
        case "obstacle":
          return <Text style={styles.obstacleText}>🧱</Text>;
        default:
          return null;
      }
    }, [
      cellInfo.type,
      cellInfo.value,
      cellInfo.bonusType,
      snakeSkin.headEmoji,
    ]);

    return (
      <View style={memoizedStyle as StyleProp<ViewStyle>}>
        {memoizedContent}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // カスタム比較関数で不要な再レンダリングを防ぐ
    return (
      prevProps.cellInfo.type === nextProps.cellInfo.type &&
      prevProps.cellInfo.value === nextProps.cellInfo.value &&
      prevProps.cellInfo.isTarget === nextProps.cellInfo.isTarget &&
      prevProps.cellInfo.bonusType === nextProps.cellInfo.bonusType &&
      prevProps.cellInfo.timeLeft === nextProps.cellInfo.timeLeft &&
      prevProps.cellInfo.isPoisonous === nextProps.cellInfo.isPoisonous &&
      prevProps.snakeSkin.id === nextProps.snakeSkin.id
    );
  }
);

GameCell.displayName = "GameCell";

export default function GameScreen() {
  const [snake, setSnake] = useState<Position[]>([{ x: 8, y: 8 }]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [speed, setSpeed] = useState(200); // より滑らかな初期速度
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
  const [completedCycles, setCompletedCycles] = useState(0); // 1-9サイクル完了数
  const [continued, setContinued] = useState(false); // コンティニュー使用フラグ

  // 広告フック
  const { showAd: showInterstitialAd, isAdLoaded: isInterstitialAdLoaded } =
    useInterstitialAd();
  const { showAd: showRewardedAd, isAdLoaded: isRewardedAdLoaded } =
    useRewardedAd();

  // アニメーション
  const achievementOpacity = useRef(new Animated.Value(0)).current;

  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTime = useRef(0);
  const directionRef = useRef<Direction>("RIGHT");
  const timeUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const gameOverHandled = useRef(false);

  // refを使って最新の状態を参照
  const numbersRef = useRef<NumberItem[]>([]);
  const bonusItemsRef = useRef<BonusItem[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextNumberRef = useRef(1);
  const scoreRef = useRef(0);

  // コンティニュー処理
  function handleContinue() {
    // ゲームオーバーフラグをリセット
    gameOverHandled.current = false;

    // 蛇を少し短くして再開（スコアとnextNumberは保持）
    const shortenedSnake = snake.slice(0, Math.max(1, snake.length - 3));
    setSnake(shortenedSnake);

    // refの値を更新
    nextNumberRef.current = nextNumber;
    scoreRef.current = score;

    // ゲームを再開するための追加設定
    setIsFrozen(false);
    setScoreMultiplier(1);
    setMultiplierDuration(0);
    setContinued(true); // コンティニュー使用済み

    // コンティニュー時は現在のスピードを維持（急激な変化を避ける）
    console.log(`Continue: maintaining current speed of ${speed}ms`);
    // スピードは変更せずに現在の値を維持

    // 新しい数字を生成（現在の蛇の位置を考慮）
    generateNumbers(shortenedSnake);

    // ゲーム状態を最後に設定
    setGameState("playing");
  }

  // 現在のスキンを取得
  const currentSkin = useMemo(
    () =>
      SNAKE_SKINS.find((skin) => skin.id === currentSkinId) || SNAKE_SKINS[0],
    [currentSkinId]
  );

  // レベル計算（1-9サイクルベース）
  const calculateLevel = useCallback((cycles: number) => {
    return cycles + 1; // サイクル完了数 + 1がレベル
  }, []);

  // 高度に最適化されたグリッドマップ
  const gridMap = useMemo(() => {
    const map: { [key: string]: CellInfo } = {};

    // まず基本の空セルを設定（遅延初期化）
    const emptyCell: CellInfo = { type: "empty" };

    // スネークの位置を設定（最も重要なので最初に処理）
    snake.forEach((segment, index) => {
      const key = `${segment.x},${segment.y}`;
      map[key] = {
        type: index === 0 ? "snakeHead" : "snakeBody",
      };
    });

    // 数字の位置を設定（計算を最小化）
    numbers.forEach((numberItem) => {
      const key = `${numberItem.position.x},${numberItem.position.y}`;
      const isTarget = numberItem.value === nextNumber;

      let cellType: CellType;
      if (numberItem.isPoisonous) {
        cellType = "poisonousNumber";
      } else if (numberItem.isTimeLimited) {
        cellType = "timeLimitedNumber";
      } else if (isTarget) {
        cellType = "targetNumber";
      } else {
        cellType = "number";
      }

      map[key] = {
        type: cellType,
        value: numberItem.value,
        isTarget,
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

    // 空のセルを遅延で追加（存在しない場合のみ）
    const getCell = (key: string): CellInfo => map[key] || emptyCell;
    map.getCell = getCell;

    return map;
  }, [snake, numbers, nextNumber, bonusItems, obstacles]);

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

  const loadGameData = useCallback(async () => {
    try {
      const statsData = await AsyncStorage.getItem("numberSnakeStats");
      if (statsData) {
        const stats = JSON.parse(statsData);
        setGameStats(stats);
        setHighScore(stats.highScore);
        setBestStreak(stats.bestStreak);
        // ハイスコアからサイクル数を推定（1サイクル = 約450点）
        const estimatedCycles = Math.floor(stats.highScore / 450);
        setCompletedCycles(estimatedCycles);
        setLevel(calculateLevel(estimatedCycles));
      }

      // 個別のハイスコアも確認（フォールバック）
      const highScoreData = await AsyncStorage.getItem("numberSnakeHighScore");
      if (highScoreData) {
        const savedHighScore = parseInt(highScoreData);
        setHighScore((prevScore) => Math.max(prevScore, savedHighScore));
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
              unlockedAchievements.find((ua: any) => ua.id === ach.id)
                ?.unlocked || false,
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
          "numberSnakeHighScore",
          newStats.highScore.toString()
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
    nextNumberRef.current = 1; // refを直接設定
    setScore(0);
    scoreRef.current = 0; // refを直接設定
    setSpeed(200);
    setObstacles([]);
    setLevel(1);
    setCompletedCycles(0);
    setBonusItems([]);
    setScoreMultiplier(1);
    setMultiplierDuration(0);
    setIsFrozen(false);
    setCurrentStreak(0);
    setComboMultiplier(1);
    gameOverHandled.current = false; // ゲーム開始時にフラグをリセット
    setContinued(false); // コンティニューフラグもリセット

    // refが確実に設定された後に数字を生成
    setTimeout(() => {
      generateNumbers(initialSnake);
    }, 50);
  }, []);

  // ハイスコア読み込み
  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

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
            // ストリークも半分にする
            setCurrentStreak((prevStreak) => Math.floor(prevStreak / 2));
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

          // デバッグ用ログ（数字を食べた時のスピード確認）
          console.log(
            `Ate number ${eatenNumber.value}, current speed: ${speed}ms`
          );

          const currentEatenNumberValue = nextNumberRef.current; // 今食べた数字の値
          const targetNextNumberValue =
            currentEatenNumberValue === 9 ? 1 : currentEatenNumberValue + 1;
          setNextNumber(targetNextNumberValue); // 次の数字をセット (useEffectでnextNumberRef.currentも更新される)

          // 1-9サイクル完了チェック（9を食べて次が1に戻る時）
          if (currentEatenNumberValue === 9) {
            const newCycles = completedCycles + 1;
            setCompletedCycles(newCycles);

            // レベル更新と難易度調整
            const newLevel = calculateLevel(newCycles);
            setLevel(newLevel);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // 新しいレベルで障害物を生成（3秒後に実行）
            setTimeout(() => {
              // 障害物生成は後でuseEffectで処理
            }, 3000);

            // 5秒後にスピードアップ（各レベルアップごと）
            setTimeout(() => {
              setSpeed((prevSpeed) => {
                const newSpeed = Math.max(prevSpeed - 10, 60); // 10msずつ減少、最低60ms
                console.log(
                  `Level up speed change: ${prevSpeed} -> ${newSpeed}`
                );
                return newSpeed;
              });
            }, 5000); // 5秒遅延（より長い猶予）
          }

          // ベストストリーク更新
          if (newStreak > bestStreak) {
            setBestStreak(newStreak);
          }

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
            const isTimeLimited = level >= 5 && Math.random() < 0.25; // レベル5から25%の確率
            const isPoisonous = level >= 8 && Math.random() < 0.1; // レベル8から10%の確率

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
    completedCycles,
    calculateLevel,
  ]);

  // requestAnimationFrameを使った滑らかなゲームループ
  const gameLoop = useCallback(
    (currentTime: number) => {
      if (gameState === "playing" && !isFrozen) {
        if (currentTime - lastMoveTime.current >= speed) {
          moveSnake();
          lastMoveTime.current = currentTime;
        }
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      }
    },
    [gameState, speed, moveSnake, isFrozen]
  );

  // ゲームループ制御
  useEffect(() => {
    if (gameState === "playing" && !isFrozen) {
      lastMoveTime.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameLoop]);

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

      // 現在の目標数字を必ず含める（失敗した場合は強制的に生成）
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

      // 100回試行しても失敗した場合は、空いている最初の位置を使用
      if (attempts >= 100) {
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (!occupiedPositions.has(`${x},${y}`)) {
              position = { x, y };
              break;
            }
          }
          if (position) break;
        }
      }

      // 目標数字を必ず追加
      newNumbers.push({
        position,
        value: nextNumberRef.current,
      });

      console.log(
        `Generated target number ${nextNumberRef.current} at position (${position.x}, ${position.y})`
      );
      occupiedPositions.add(`${position.x},${position.y}`);

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
      // 広告表示（インタースティシャル or リワード）
      // コンティニュー未使用かつリワード広告が読み込み済みの場合
      if (!continued && isRewardedAdLoaded) {
        // 何もしない（ユーザーの選択を待つ）
      } else if (!continued && isInterstitialAdLoaded) {
        // コンティニュー未使用の場合のみインタースティシャル広告を表示
        showInterstitialAd();
      }

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

        // カスタムゲームオーバーUIを表示（Alertは削除）
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
    continued,
    isInterstitialAdLoaded,
    isRewardedAdLoaded,
    showInterstitialAd,
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

  // ゲーム状態チェックの最適化
  const isPlaying = gameState === "playing";
  const isPaused = gameState === "paused";
  const isGameOver = gameState === "gameOver";

  // 高度に最適化されたグリッドレンダリング（FlatList風のアプローチ）
  const renderGrid = useMemo(() => {
    const grid = [];
    const emptyCell: CellInfo = { type: "empty" };

    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const cellInfo = gridMap[key] || emptyCell;

        // 空のセルは軽量化
        if (cellInfo.type === "empty") {
          row.push(<View key={key} style={styles.cell} />);
        } else {
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
      }

      // 各行をメモ化
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
    if (level >= 5 && gameState === "playing") {
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
    if (level >= 8 && gameState === "playing") {
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

  // レベル変更時の障害物生成
  useEffect(() => {
    if (level > 1 && gameState === "playing") {
      // 少し遅延させて障害物を生成（レベルアップから3秒後）
      const generateObstaclesTimeout = setTimeout(() => {
        const occupiedPositions = [
          ...snake,
          ...numbers.map((n) => n.position),
          ...bonusItems.map((b) => b.position),
        ];

        const obstacleCount = Math.min(level - 1, 12); // 最大12個まで
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
            const isMoving = level >= 8 && Math.random() < 0.4; // レベル8から移動開始、確率40%
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
      }, 3000); // 3秒後に障害物を生成

      return () => clearTimeout(generateObstaclesTimeout);
    }
  }, [level, gameState, snake, numbers, bonusItems]);

  const generateObstacles = useCallback(
    (level: number, occupiedPositions: Position[]) => {
      if (level < 2) return; // レベル2から障害物開始

      // レベルに応じて障害物の数を決定（より早く増加）
      const obstacleCount = Math.min(level - 1, 12); // 最大12個まで
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
          const isMoving = level >= 8 && Math.random() < 0.4; // レベル8から移動開始、確率40%
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

        <View style={styles.headerButtons}>
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

      {/* バナー広告 */}
      <AdBanner />

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

      {/* Game Over Dialog */}
      {gameState === "gameOver" && (
        <View style={styles.dialogOverlay}>
          <View style={styles.gameOverDialog}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.currentScoreText}>Score: {score}</Text>
            <Text style={styles.highScoreText}>High Score: {highScore}</Text>
            <View style={styles.dialogButtons}>
              {!continued && (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !isRewardedAdLoaded && styles.disabledButton,
                  ]}
                  onPress={async () => {
                    try {
                      console.log(
                        "Continue button pressed - showing rewarded ad"
                      );
                      const result = await showRewardedAd();
                      console.log("Rewarded ad result:", result);
                      if (result) {
                        // 広告視聴成功時のみコンティニュー
                        console.log(
                          "Ad watched successfully - continuing game"
                        );
                        handleContinue();
                      } else {
                        // 広告視聴失敗時はゲームオーバー画面を維持
                        console.log(
                          "Rewarded ad was not completed - staying on game over screen"
                        );
                      }
                    } catch (error) {
                      console.error("Error showing rewarded ad:", error);
                    }
                  }}
                  disabled={!isRewardedAdLoaded}
                >
                  <Text style={styles.retryButtonText}>Continue (Ad)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setContinued(false); // コンティニューフラグをリセット
                  initializeGame();
                  // ゲーム状態は初期化後に設定
                  setTimeout(() => setGameState("playing"), 100);
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.homeButtonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* How To Play Dialog */}
      {gameState === "howToPlay" && (
        <View style={styles.dialogOverlay}>
          <View style={styles.howToPlayDialog}>
            <Text style={styles.howToPlayTitle}>How To Play</Text>

            <View style={styles.howToPlayContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🎯</Text>
                <Text style={styles.sectionTitle}>Objective:</Text>
              </View>
              <Text style={styles.sectionText}>
                Eat numbers in sequence (1→2→3...→9→1)
              </Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🎮</Text>
                <Text style={styles.sectionTitle}>Controls:</Text>
              </View>
              <Text style={styles.sectionText}>
                • Swipe or tap to change direction
              </Text>
              <Text style={styles.sectionText}>
                • Avoid walls and obstacles
              </Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🔢</Text>
                <Text style={styles.sectionTitle}>Numbers:</Text>
              </View>
              <Text style={styles.sectionText}>
                • Yellow: Target number to eat
              </Text>
              <Text style={styles.sectionText}>• Gray: Other numbers</Text>
              <Text style={styles.sectionText}>• Red: Poisonous (avoid!)</Text>
              <Text style={styles.sectionText}>• Blinking: Time-limited</Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>⭐</Text>
                <Text style={styles.sectionTitle}>Bonuses:</Text>
              </View>
              <Text style={styles.sectionText}>• ⭐ Score multiplier</Text>
              <Text style={styles.sectionText}>• ❄️ Time freeze</Text>
              <Text style={styles.sectionText}>• ✂️ Shrink snake</Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🏆</Text>
                <Text style={styles.sectionTitle}>Scoring:</Text>
              </View>
              <Text style={styles.sectionText}>
                • Eat correct numbers for points
              </Text>
              <Text style={styles.sectionText}>
                • Build streaks for bonus multipliers
              </Text>
              <Text style={styles.sectionText}>
                • Unlock achievements and skins
              </Text>
            </View>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => setGameState("playing")}
            >
              <Text style={styles.gotItButtonText}>Got It!</Text>
            </TouchableOpacity>

            {/* Bottom Navigation */}
            <View style={styles.bottomNavigation}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.navIcon}>🏠</Text>
                <Text style={styles.navLabel}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  // Navigate to rankings - you may need to implement this route
                  // router.push("/rankings");
                }}
              >
                <Text style={styles.navIcon}>🏆</Text>
                <Text style={styles.navLabel}>Rankings</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  helpButton: {
    backgroundColor: "#22c55e",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  helpButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
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
  dialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  gameOverDialog: {
    backgroundColor: "#1f2937",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ef4444",
    minWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
  gameOverTitle: {
    color: "#ef4444",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 20,
  },
  currentScoreText: {
    color: "#ffffff",
    fontSize: 20,
    marginBottom: 10,
  },
  highScoreText: {
    color: "#fbbf24",
    fontSize: 20,
    marginBottom: 30,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: 15,
  },
  retryButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  continueButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  disabledButton: {
    backgroundColor: "#4b5563",
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  homeButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  homeButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  howToPlayDialog: {
    backgroundColor: "#1f2937",
    borderRadius: 15,
    padding: 20,
    borderWidth: 3,
    borderColor: "#22c55e",
    maxWidth: 350,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
  howToPlayTitle: {
    color: "#22c55e",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  howToPlayContent: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionText: {
    color: "#e5e7eb",
    fontSize: 14,
    marginBottom: 3,
    marginLeft: 24,
  },
  gotItButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: "center",
    marginBottom: 20,
  },
  gotItButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 15,
  },
  navItem: {
    alignItems: "center",
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  navLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
});
