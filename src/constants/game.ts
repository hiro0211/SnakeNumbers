import { Dimensions } from "react-native";
import { SnakeSkin, Achievement, GameStats } from "@/types/game";

// 画面サイズとグリッド設定
export const { width, height } = Dimensions.get("window");
export const GRID_SIZE = 17;
export const MARGIN = 30; // 画面端の余白
export const AVAILABLE_SIZE = Math.min(width - MARGIN * 2, height * 0.8); // ヘッダーとUIを除いた利用可能サイズ
export const CELL_SIZE = 22;

// スネークスキンデータ
export const SNAKE_SKINS: SnakeSkin[] = [
  {
    id: "default",
    name: "クラシック",
    unlockLevel: 1,
    headColor: "#4CAF50",
    bodyColor: "#8BC34A",
    fontColor: "#FFFFFF",
  },
  {
    id: "fire",
    name: "ファイア",
    unlockLevel: 5,
    headColor: "#FF5722",
    bodyColor: "#FF9800",
    fontColor: "#FFFFFF",
  },
  {
    id: "ice",
    name: "アイス",
    unlockLevel: 10,
    headColor: "#03A9F4",
    bodyColor: "#81D4FA",
    fontColor: "#000000",
  },
  {
    id: "gold",
    name: "ゴールド",
    unlockLevel: 20,
    headColor: "#FFC107",
    bodyColor: "#FFD54F",
    fontColor: "#000000",
  },
];

// アチーブメントデータ
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_game",
    name: "はじめの一歩",
    description: "最初のゲームをプレイする",
    unlocked: false,
    condition: (stats) => stats.gamesPlayed >= 1,
  },
  {
    id: "score_1000",
    name: "スコア1000達成",
    description: "スコアが1000を超える",
    unlocked: false,
    condition: (_, score) => score >= 1000,
  },
  {
    id: "snake_length_20",
    name: "ロングスネーク",
    description: "スネークの長さが20を超える",
    unlocked: false,
    condition: (_, __, length) => length >= 20,
  },
  {
    id: "perfect_game",
    name: "パーフェクト！",
    description: "ミスなしで9まで到達する",
    unlocked: false,
    condition: (stats) => stats.perfectGames > 0,
  },
];
