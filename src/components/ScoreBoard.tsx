import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { gameStyles } from "@/styles/gameStyles";

type ScoreBoardProps = {
  score: number;
  highScore: number;
  level: number;
  currentStreak: number;
  nextNumber: number;
  scoreMultiplier: number;
  multiplierDuration: number;
  isFrozen: boolean;
  getNumberBlockCount: (level: number) => number;
};

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  highScore,
  level,
  currentStreak,
  nextNumber,
  scoreMultiplier,
  multiplierDuration,
  isFrozen,
}) => {
  return (
    <View style={gameStyles.scoreBoardContainer}>
      <View style={gameStyles.scoreRow}>
        <View style={gameStyles.scoreItem}>
          <Text style={gameStyles.scoreLabel}>SCORE</Text>
          <Text style={gameStyles.scoreValue}>{score}</Text>
        </View>
        <View style={gameStyles.scoreItem}>
          <Text style={gameStyles.scoreLabel}>HIGH SCORE</Text>
          <Text style={gameStyles.scoreValue}>{highScore}</Text>
        </View>
        <View style={gameStyles.scoreItem}>
          <Text style={gameStyles.scoreLabel}>LEVEL</Text>
          <Text style={gameStyles.scoreValue}>{level}</Text>
        </View>
        <View style={gameStyles.scoreItem}>
          <Text style={gameStyles.scoreLabel}>STREAK</Text>
          <Text style={gameStyles.scoreValue}>{currentStreak}</Text>
        </View>
      </View>
      <View style={gameStyles.nextNumberContainer}>
        <Text style={gameStyles.nextNumberText}>Next: {nextNumber}</Text>
      </View>
      <View style={gameStyles.statusEffectContainer}>
        {scoreMultiplier > 1 && (
          <View style={gameStyles.statusEffect}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={gameStyles.statusText}>
              x2 ({multiplierDuration}s)
            </Text>
          </View>
        )}
        {isFrozen && (
          <View style={gameStyles.statusEffect}>
            <Ionicons name="snow" size={16} color="#00BFFF" />
            <Text style={gameStyles.statusText}>Frozen</Text>
          </View>
        )}
      </View>
    </View>
  );
};
