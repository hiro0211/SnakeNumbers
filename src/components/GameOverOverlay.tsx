import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { gameStyles } from "@/styles/gameStyles";

type GameOverOverlayProps = {
  score: number;
  highScore: number;
  onRetry: () => void;
};

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  score,
  highScore,
  onRetry,
}) => {
  return (
    <View style={gameStyles.overlay}>
      <View style={gameStyles.gameOverContainer}>
        <Text style={gameStyles.overlayText}>GAME OVER</Text>
        <Text style={gameStyles.scoreValue}>Score: {score}</Text>
        <Text style={gameStyles.scoreLabel}>High Score: {highScore}</Text>
        <TouchableOpacity onPress={onRetry} style={gameStyles.retryButton}>
          <Text style={gameStyles.retryButtonText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
