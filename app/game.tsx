import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";

const { width, height } = Dimensions.get("window");
const GRID_SIZE = 16;
const MARGIN = 30; // 画面端の余白
const AVAILABLE_SIZE = Math.min(width - MARGIN * 2, height - 300); // ヘッダーとUIを除いた利用可能サイズ
const CELL_SIZE = AVAILABLE_SIZE / GRID_SIZE;

// ゲームの状態
type GameState = "playing" | "paused" | "gameOver";

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

export default function GameScreen() {
  const [snake, setSnake] = useState<Position[]>([{ x: 8, y: 8 }]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [speed, setSpeed] = useState(200);
  const [highScore, setHighScore] = useState(0);

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<Direction>("RIGHT");

  // refを使って最新の状態を参照
  const numbersRef = useRef<NumberItem[]>([]);
  const nextNumberRef = useRef(1);
  const scoreRef = useRef(0);

  // refを更新
  useEffect(() => {
    numbersRef.current = numbers;
  }, [numbers]);

  useEffect(() => {
    nextNumberRef.current = nextNumber;
  }, [nextNumber]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // ハイスコア読み込み
  useEffect(() => {
    loadHighScore();
    initializeGame();
  }, []);

  const loadHighScore = async () => {
    try {
      const score = await AsyncStorage.getItem("numberSnakeHighScore");
      if (score !== null) {
        setHighScore(parseInt(score));
      }
    } catch (error) {
      console.error("Error loading high score:", error);
    }
  };

  const saveHighScore = async (newScore: number) => {
    try {
      if (newScore > highScore) {
        await AsyncStorage.setItem("numberSnakeHighScore", newScore.toString());
        setHighScore(newScore);
      }

      // Save score history
      const historyData = await AsyncStorage.getItem("numberSnakeScoreHistory");
      let history = historyData ? JSON.parse(historyData) : [];

      const newRecord = {
        score: newScore,
        date: new Date().toISOString(),
        id: Date.now().toString(),
      };

      history.push(newRecord);

      // Keep only the latest 20 records
      if (history.length > 20) {
        history = history.slice(-20);
      }

      await AsyncStorage.setItem(
        "numberSnakeScoreHistory",
        JSON.stringify(history)
      );
    } catch (error) {
      console.error("Error saving score:", error);
    }
  };

  const initializeGame = () => {
    const initialSnake = [{ x: 8, y: 8 }];
    setSnake(initialSnake);
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setNextNumber(1);
    setScore(0);
    setSpeed(200);
    generateNumbers(initialSnake);
  };

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

      // 自分自身との衝突チェック
      if (
        newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
      ) {
        setGameState("gameOver");
        return currentSnake;
      }

      newSnake.unshift(head);

      // 数字との衝突チェック
      const eatenNumber = numbersRef.current.find(
        (num) => num.position.x === head.x && num.position.y === head.y
      );

      if (eatenNumber) {
        if (eatenNumber.value === nextNumberRef.current) {
          // 正しい数字を食べた
          const newScore = scoreRef.current + eatenNumber.value * 10;
          setScore(newScore);

          const currentEatenNumberValue = nextNumberRef.current; // 今食べた数字の値
          const targetNextNumberValue =
            currentEatenNumberValue === 9 ? 1 : currentEatenNumberValue + 1;
          setNextNumber(targetNextNumberValue); // 次の数字をセット (useEffectでnextNumberRef.currentも更新される)

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
              ]),
              value: targetNextNumberValue,
            });
          } else {
            // 次に取るべき数字が既に盤面にある場合、ランダムな数字を追加して盤面のアイテム数を維持
            updatedNumbersList.push({
              position: getRandomEmptyPosition([
                ...newSnake,
                ...updatedNumbersList.map((n) => n.position),
              ]),
              value: Math.floor(Math.random() * 9) + 1,
            });
          }

          setNumbers(updatedNumbersList);

          // スピードアップ（500点ごと）
          if (newScore % 500 === 0 && speed > 50) {
            setSpeed((prev) => Math.max(prev - 20, 50));
          }

          // 蛇が伸びるので尻尾は削除しない
        } else {
          // 間違った数字を食べた
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
  }, [speed]);

  // ゲームループ
  useEffect(() => {
    if (gameState === "playing") {
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
  }, [gameState, speed, moveSnake]);

  const generateNumbers = (currentSnake: Position[]) => {
    const newNumbers: NumberItem[] = [];
    const occupiedPositions = new Set(
      currentSnake.map((pos) => `${pos.x},${pos.y}`)
    );

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
        newNumbers.push({
          position,
          value: Math.floor(Math.random() * 9) + 1,
        });
      }
    }

    setNumbers(newNumbers);
  };

  const getRandomEmptyPosition = (occupiedPositions: Position[]): Position => {
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
  };

  // ゲームオーバー処理
  useEffect(() => {
    if (gameState === "gameOver") {
      saveHighScore(score);
      setTimeout(() => {
        Alert.alert(
          "Game Over",
          `Score: ${score}\nHigh Score: ${Math.max(score, highScore)}`,
          [
            {
              text: "Retry",
              onPress: () => {
                setGameState("playing");
                initializeGame();
              },
            },
            { text: "Back to Home", onPress: () => router.replace("/(tabs)") },
          ]
        );
      }, 100);
    }
  }, [gameState, score, highScore]);

  // スワイプ操作
  const panResponder = PanResponder.create({
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
  });

  const togglePause = () => {
    setGameState((prev) => (prev === "playing" ? "paused" : "playing"));
  };

  const renderCell = (x: number, y: number) => {
    const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
    const isSnakeBody = snake
      .slice(1)
      .some((segment) => segment.x === x && segment.y === y);
    const numberItem = numbers.find(
      (num) => num.position.x === x && num.position.y === y
    );

    let cellStyle = [styles.cell];
    let content = null;

    if (isSnakeHead) {
      // @ts-ignore
      cellStyle = [styles.cell, { backgroundColor: "#4ade80" }];
      content = <Text style={styles.snakeHeadText}>🐍</Text>;
    } else if (isSnakeBody) {
      // @ts-ignore
      cellStyle = [styles.cell, { backgroundColor: "#22c55e" }];
    } else if (numberItem) {
      // @ts-ignore
      cellStyle = [
        styles.cell,
        // @ts-ignore
        numberItem.value === nextNumber
          ? {
              backgroundColor: "#fbbf24",
              borderWidth: 2,
              borderColor: "#f59e0b",
            }
          : {
              backgroundColor: "#374151",
              borderWidth: 1,
              borderColor: "#6b7280",
            },
      ];
      content = <Text style={styles.numberText}>{numberItem.value}</Text>;
    }

    return (
      <View key={`${x}-${y}`} style={cellStyle as StyleProp<ViewStyle>}>
        {content}
      </View>
    );
  };

  const renderGrid = () => {
    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(renderCell(x, y));
      }
      grid.push(
        <View key={y} style={styles.row}>
          {row}
        </View>
      );
    }
    return grid;
  };

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

        <TouchableOpacity onPress={togglePause} style={styles.pauseButton}>
          <Text style={styles.pauseButtonText}>
            {gameState === "paused" ? "▶️" : "⏸️"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Score Display */}
      <View style={styles.scoreBoard}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Next</Text>
          <Text style={styles.nextNumberDisplay}>{nextNumber}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>High Score</Text>
          <Text style={styles.scoreValue}>{highScore}</Text>
        </View>
      </View>

      {/* Game Grid */}
      <View style={styles.gameContainer} {...panResponder.panHandlers}>
        <View style={styles.grid}>{renderGrid()}</View>

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
});
