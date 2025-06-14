import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { gameStyles } from "@/styles/gameStyles";

type PauseOverlayProps = {
  onResume: () => void;
};

export const PauseOverlay: React.FC<PauseOverlayProps> = ({ onResume }) => {
  return (
    <TouchableOpacity
      style={gameStyles.overlay}
      onPress={onResume}
      activeOpacity={1}
    >
      <Text style={gameStyles.overlayText}>PAUSED</Text>
    </TouchableOpacity>
  );
};
