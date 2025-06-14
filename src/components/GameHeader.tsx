import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { gameStyles } from "@/styles/gameStyles";
import { GameState } from "@/types/game";

type GameHeaderProps = {
  gameState: GameState;
  onTogglePause: () => void;
};

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameState,
  onTogglePause,
}) => {
  return (
    <View style={gameStyles.headerContainer}>
      <Text style={gameStyles.title}>Snake Numbers</Text>
      <TouchableOpacity onPress={onTogglePause} style={gameStyles.pauseButton}>
        <Ionicons
          name={gameState === "playing" ? "pause" : "play"}
          size={24}
          color="#e0e0e0"
        />
      </TouchableOpacity>
    </View>
  );
};
