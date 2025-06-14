import React from "react";
import { View, PanResponderInstance } from "react-native";
import { gameStyles } from "@/styles/gameStyles";
import { GRID_SIZE } from "@/constants/game";
import { CellInfo, Direction, SnakeSkin } from "@/types/game";
import GameCell from "./GameCell";

type GameGridProps = {
  gridMap: { [key: string]: CellInfo };
  currentSkin: SnakeSkin;
  panResponder: PanResponderInstance;
  onDirectionChange: (direction: Direction) => void; // This might be redundant if panResponder is handled in game.tsx
};

export const GameGrid: React.FC<GameGridProps> = ({
  gridMap,
  currentSkin,
  panResponder,
}) => {
  return (
    <View style={gameStyles.gridContainer} {...panResponder.panHandlers}>
      {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
        const x = i % GRID_SIZE;
        const y = Math.floor(i / GRID_SIZE);
        const cellInfo = gridMap[`${x},${y}`] || { type: "empty" };
        return (
          <GameCell key={`${x}-${y}`} cellInfo={cellInfo} skin={currentSkin} />
        );
      })}
    </View>
  );
};
