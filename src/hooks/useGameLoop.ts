import { useEffect, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Vibration } from "react-native";
import { AppState } from "@/state/reducer";
import { Action } from "@/state/actions";
import {
  Direction,
  Position,
  NumberItem,
  BonusItem,
  Obstacle,
  BonusItemType,
} from "../types/game";
import { GRID_SIZE } from "../constants/game";

// ゲームユーティリティ関数
const getRandomEmptyPosition = (occupiedPositions: Set<string>): Position => {
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
    attempts < 200
  );
  return position;
};

const getOccupiedPositions = (state: AppState): Set<string> => {
  const occupied = new Set<string>();
  state.snake.forEach((p) => occupied.add(`${p.x},${p.y}`));
  state.numbers.forEach((n) => occupied.add(`${n.position.x},${n.position.y}`));
  state.obstacles.forEach((o) =>
    occupied.add(`${o.position.x},${o.position.y}`)
  );
  state.bonusItems.forEach((b) =>
    occupied.add(`${b.position.x},${b.position.y}`)
  );
  return occupied;
};

const calculateLevel = (score: number) => Math.floor(score / 500) + 1;

export function useGameLoop(
  state: AppState,
  dispatch: React.Dispatch<Action>,
  directionRef: React.MutableRefObject<Direction>
) {
  const {
    snake,
    direction,
    numbers,
    nextNumber,
    score,
    gameState,
    speed,
    isFrozen,
    currentStreak,
    level,
    scoreMultiplier,
    multiplierDuration,
    obstacles,
    bonusItems,
  } = state;
  const gameLoop = useRef<number>();
  const lastUpdateTime = useRef(0);
  const timerInterval = useRef<NodeJS.Timeout>();

  const moveSnake = () => {
    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    switch (directionRef.current) {
      case "UP":
        head.y--;
        break;
      case "DOWN":
        head.y++;
        break;
      case "LEFT":
        head.x--;
        break;
      case "RIGHT":
        head.x++;
        break;
    }

    // 衝突判定
    if (
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE ||
      obstacles.some(
        (o) => o.position.x === head.x && o.position.y === head.y
      ) ||
      snake.some((p) => p.x === head.x && p.y === head.y)
    ) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Vibration.vibrate(500);
      dispatch({
        type: "GAME_OVER",
        payload: {
          newStats: state.gameStats,
          newAchievements: state.achievements,
          newHighScore: state.highScore,
        },
      });
      return;
    }

    newSnake.unshift(head);

    const eatenNumber = numbers.find(
      (n) => n.position.x === head.x && n.position.y === head.y
    );
    if (eatenNumber) {
      if (eatenNumber.isPoisonous) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.vibrate(500);
        dispatch({ type: "EAT_POISON" });
        return;
      }

      if (eatenNumber.value === nextNumber) {
        // 正しい数字を食べた
        const newStreak = currentStreak + 1;
        const streakBonus = Math.floor(newStreak / 5) + 1;
        const totalMultiplier = scoreMultiplier * streakBonus;
        const newScore = score + eatenNumber.value * 10 * totalMultiplier;

        let newNumbers = numbers.filter((n) => n !== eatenNumber);
        const targetNextNumberValue = nextNumber === 9 ? 1 : nextNumber + 1;

        const occupied = getOccupiedPositions({
          ...state,
          snake: newSnake,
          numbers: newNumbers,
        });

        if (!newNumbers.some((n) => n.value === targetNextNumberValue)) {
          newNumbers.push({
            position: getRandomEmptyPosition(occupied),
            value: targetNextNumberValue,
          });
          occupied.add(
            `${newNumbers[newNumbers.length - 1].position.x},${
              newNumbers[newNumbers.length - 1].position.y
            }`
          );
        }

        // 新しい数字を追加
        newNumbers.push({
          position: getRandomEmptyPosition(occupied),
          value: Math.floor(Math.random() * 9) + 1,
        });

        dispatch({
          type: "EAT_NUMBER",
          payload: {
            newSnake,
            newScore,
            newNextNumber: targetNextNumberValue,
            newNumbers,
            newStreak,
          },
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (multiplierDuration > 0) {
          dispatch({ type: "DECREMENT_MULTIPLIER_DURATION" });
        }

        // レベルアップチェック
        const newLevel = calculateLevel(newScore);
        if (newLevel > level) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          const occupied = getOccupiedPositions({
            ...state,
            snake: newSnake,
            numbers: newNumbers,
          });
          const newObstacles = [...obstacles];
          const obstacleCount = Math.min(Math.floor((newLevel - 1) / 2), 8);
          if (obstacles.length < obstacleCount) {
            newObstacles.push({ position: getRandomEmptyPosition(occupied) });
          }
          dispatch({ type: "LEVEL_UP", payload: { newLevel, newObstacles } });
        }

        // ボーナスアイテム生成
        if (Math.random() < 0.25 && bonusItems.length === 0) {
          const bonusTypes: BonusItemType[] = [
            "SCORE_MULTIPLIER",
            "TIME_FREEZE",
            "SHRINK",
          ];
          const type =
            bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
          const occupied = getOccupiedPositions({
            ...state,
            snake: newSnake,
            numbers: newNumbers,
          });
          const newBonus: BonusItem = {
            position: getRandomEmptyPosition(occupied),
            type,
          };
          dispatch({
            type: "EAT_BONUS",
            payload: { bonus: newBonus, newBonuses: [...bonusItems, newBonus] },
          });
        }
      } else {
        // 間違った数字
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.vibrate(500);
        dispatch({ type: "RESET_STREAK" });
        dispatch({
          type: "GAME_OVER",
          payload: {
            newStats: state.gameStats,
            newAchievements: state.achievements,
            newHighScore: state.highScore,
          },
        });
        return;
      }
    } else {
      newSnake.pop(); // 何も食べなければ尻尾を消す
      dispatch({ type: "MOVE_SNAKE", payload: { newSnake } });
    }

    const eatenBonus = bonusItems.find(
      (b) => b.position.x === head.x && b.position.y === head.y
    );
    if (eatenBonus) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newBonuses = bonusItems.filter((b) => b !== eatenBonus);
      dispatch({
        type: "EAT_BONUS",
        payload: { bonus: eatenBonus, newBonuses },
      });
      if (eatenBonus.type === "TIME_FREEZE") {
        setTimeout(
          () => dispatch({ type: "SET_FROZEN", payload: false }),
          3000
        );
      }
    }
  };

  const gameTick = (timestamp: number) => {
    if (gameState !== "playing" || isFrozen) {
      lastUpdateTime.current = timestamp;
      gameLoop.current = requestAnimationFrame(gameTick);
      return;
    }

    const delta = timestamp - lastUpdateTime.current;
    if (delta > speed) {
      lastUpdateTime.current = timestamp;
      moveSnake();
    }
    gameLoop.current = requestAnimationFrame(gameTick);
  };

  useEffect(() => {
    // 初期化ロジック
    const occupied = getOccupiedPositions(state);
    const initialNumbers: NumberItem[] = [];
    for (let i = 0; i < 5; i++) {
      initialNumbers.push({
        position: getRandomEmptyPosition(occupied),
        value: i === 0 ? 1 : Math.floor(Math.random() * 9) + 1,
      });
      occupied.add(
        `${initialNumbers[i].position.x},${initialNumbers[i].position.y}`
      );
    }
    dispatch({ type: "SET_NUMBERS", payload: initialNumbers });
  }, []);

  useEffect(() => {
    if (gameState === "playing" && !isFrozen) {
      lastUpdateTime.current = performance.now();
      gameLoop.current = requestAnimationFrame(gameTick);
    }
    return () => {
      if (gameLoop.current) {
        cancelAnimationFrame(gameLoop.current);
      }
    };
  }, [gameState, isFrozen, speed]);

  useEffect(() => {
    if (gameState === "playing" && !isFrozen && level >= 8) {
      timerInterval.current = setInterval(() => {
        dispatch({ type: "UPDATE_TIMER" });
      }, 1000);
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [gameState, isFrozen, level]);
}
