import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  PanResponder,
  StatusBar,
  Vibration,
  View,
  Animated,
} from "react-native";
import {
  Position,
  Direction,
  NumberItem,
  GameStats,
  Achievement,
  CellInfo,
  BonusItemType,
} from "@/types/game";
import { GRID_SIZE, SNAKE_SKINS } from "@/constants/game";
import { gameStyles } from "@/styles/gameStyles";
import { GameHeader } from "@/components/GameHeader";
import { ScoreBoard } from "@/components/ScoreBoard";
import { SkinSelector } from "@/components/SkinSelector";
import { GameGrid } from "@/components/GameGrid";
import { AchievementNotification } from "@/components/AchievementNotification";
import { PauseOverlay } from "@/components/PauseOverlay";
import { GameOverOverlay } from "@/components/GameOverOverlay";
import { gameReducer, initialState } from "@/state/reducer";
import { useGameLoop } from "@/hooks/useGameLoop";

export default function GameScreen() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const {
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
    level,
    showGameOver,
    showAchievement,
    currentSkinId,
    gameStats,
    achievements,
    bestStreak,
  } = state;

  const directionRef = useRef<Direction>("RIGHT");
  const achievementOpacity = useRef(new Animated.Value(0)).current;

  // ゲームの主要なロジックをuseGameLoopに集約
  useGameLoop(state, dispatch, directionRef);

  // データロードと保存
  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await AsyncStorage.getItem("numberSnakeStats");
        const stats = statsData ? JSON.parse(statsData) : gameStats;

        const achievementsData = await AsyncStorage.getItem(
          "numberSnakeAchievements"
        );
        const unlockedAchievements = achievementsData
          ? JSON.parse(achievementsData)
          : [];

        const loadedAchievements = achievements.map((ach) => ({
          ...ach,
          unlocked:
            unlockedAchievements.some(
              (ua: { id: string }) => ua.id === ach.id
            ) || ach.unlocked,
        }));

        const skinData = await AsyncStorage.getItem("numberSnakeCurrentSkin");
        const currentLevel = Math.floor((stats.highScore || 0) / 500) + 1;

        dispatch({
          type: "LOAD_GAME_DATA",
          payload: {
            stats,
            achievements: loadedAchievements,
            skinId: skinData || "default",
            level: currentLevel,
          },
        });
      } catch (error) {
        console.error("Error loading game data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(
          "numberSnakeStats",
          JSON.stringify(gameStats)
        );
        await AsyncStorage.setItem(
          "numberSnakeAchievements",
          JSON.stringify(achievements.filter((a) => a.unlocked))
        );
        await AsyncStorage.setItem("numberSnakeCurrentSkin", currentSkinId);
      } catch (error) {
        console.error("Error saving game data:", error);
      }
    };
    if (gameState === "gameOver") {
      saveData();
    }
  }, [gameStats, achievements, currentSkinId, gameState]);

  // UIインタラクションのハンドラ
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (evt, gestureState) => {
          const { dx, dy } = gestureState;
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && directionRef.current !== "LEFT")
              directionRef.current = "RIGHT";
            else if (dx < 0 && directionRef.current !== "RIGHT")
              directionRef.current = "LEFT";
          } else {
            if (dy > 0 && directionRef.current !== "UP")
              directionRef.current = "DOWN";
            else if (dy < 0 && directionRef.current !== "DOWN")
              directionRef.current = "UP";
          }
          dispatch({ type: "SET_DIRECTION", payload: directionRef.current });
        },
      }),
    []
  );

  const togglePause = useCallback(() => {
    dispatch({ type: gameState === "playing" ? "PAUSE" : "RESUME" });
  }, [gameState]);

  const changeSkin = useCallback(
    (skinId: string) => {
      const skin = SNAKE_SKINS.find((s) => s.id === skinId);
      if (skin && level >= skin.unlockLevel) {
        dispatch({ type: "CHANGE_SKIN", payload: skinId });
      }
    },
    [level]
  );

  const handleRetry = useCallback(() => {
    dispatch({
      type: "INITIALIZE_GAME",
      payload: { initialSnake: initialState.snake, numbers: [], obstacles: [] },
    });
  }, []);

  const handleDirectionChange = useCallback((newDirection: Direction) => {
    const opposite: { [key in Direction]: Direction } = {
      UP: "DOWN",
      DOWN: "UP",
      LEFT: "RIGHT",
      RIGHT: "LEFT",
    };
    if (directionRef.current !== opposite[newDirection]) {
      directionRef.current = newDirection;
      dispatch({ type: "SET_DIRECTION", payload: newDirection });
    }
  }, []);

  const getNumberBlockCount = useCallback((currentLevel: number) => {
    if (currentLevel <= 3) return Math.floor(Math.random() * 2) + 3;
    if (currentLevel <= 6) return Math.floor(Math.random() * 2) + 4;
    if (currentLevel <= 10) return Math.floor(Math.random() * 2) + 5;
    if (currentLevel <= 15) return Math.floor(Math.random() * 2) + 6;
    if (currentLevel <= 20) return Math.floor(Math.random() * 2) + 7;
    if (currentLevel <= 30) return Math.floor(Math.random() * 2) + 8;
    return Math.floor(Math.random() * 2) + 9;
  }, []);

  const currentSkin = useMemo(
    () => SNAKE_SKINS.find((s) => s.id === currentSkinId) || SNAKE_SKINS[0],
    [currentSkinId]
  );

  const gridMap = useMemo(() => {
    const map: { [key: string]: CellInfo } = {};
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        map[`${x},${y}`] = { type: "empty" };
      }
    }
    snake.forEach((seg, i) => {
      map[`${seg.x},${seg.y}`] = { type: i === 0 ? "snakeHead" : "snakeBody" };
    });
    numbers.forEach((n) => {
      let cellType: CellInfo["type"] = n.isPoisonous
        ? "poisonousNumber"
        : n.isTimeLimited
        ? "timeLimitedNumber"
        : n.value === nextNumber
        ? "targetNumber"
        : "number";
      map[`${n.position.x},${n.position.y}`] = {
        type: cellType,
        value: n.value,
        isTarget: n.value === nextNumber,
        timeLeft: n.timeLeft,
        isPoisonous: n.isPoisonous,
      };
    });
    bonusItems.forEach((b) => {
      map[`${b.position.x},${b.position.y}`] = {
        type: "bonus",
        bonusType: b.type,
      };
    });
    obstacles.forEach((o) => {
      map[`${o.position.x},${o.position.y}`] = { type: "obstacle" };
    });
    return map;
  }, [snake, numbers, nextNumber, bonusItems, obstacles]);

  return (
    <View style={gameStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <GameHeader gameState={gameState} onTogglePause={togglePause} />
      <ScoreBoard
        score={score}
        highScore={highScore}
        level={level}
        currentStreak={currentStreak}
        nextNumber={nextNumber}
        scoreMultiplier={scoreMultiplier}
        multiplierDuration={multiplierDuration}
        isFrozen={isFrozen}
        getNumberBlockCount={getNumberBlockCount}
      />
      <SkinSelector
        currentSkinId={currentSkinId}
        level={level}
        onChangeSkin={changeSkin}
      />
      <GameGrid
        gridMap={gridMap}
        currentSkin={currentSkin}
        panResponder={panResponder}
        onDirectionChange={handleDirectionChange}
      />
      <AchievementNotification
        achievement={showAchievement}
        opacity={achievementOpacity}
      />
      {gameState === "paused" && <PauseOverlay onResume={togglePause} />}
      {showGameOver && (
        <GameOverOverlay
          score={score}
          highScore={highScore}
          onRetry={handleRetry}
        />
      )}
    </View>
  );
}
