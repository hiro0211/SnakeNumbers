import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CellInfo, SnakeSkin } from "@/types/game";
import { gameStyles } from "@/styles/gameStyles";
import { CELL_SIZE } from "@/constants/game";

type GameCellProps = {
  cellInfo: CellInfo;
  skin: SnakeSkin;
};

const GameCell: React.FC<GameCellProps> = ({ cellInfo, skin }) => {
  const renderContent = () => {
    switch (cellInfo.type) {
      case "snakeHead":
        return (
          <View
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: skin.headColor,
              borderRadius: CELL_SIZE * 0.3,
            }}
          />
        );
      case "snakeBody":
        return (
          <View
            style={{
              width: CELL_SIZE * 0.8,
              height: CELL_SIZE * 0.8,
              backgroundColor: skin.bodyColor,
              borderRadius: CELL_SIZE * 0.2,
            }}
          />
        );
      case "targetNumber":
      case "number":
      case "timeLimitedNumber":
      case "poisonousNumber":
        const numberStyle = {
          ...gameStyles.numberText,
          color: cellInfo.isTarget ? skin.fontColor : "#cccccc",
        };
        const cellStyle = {
          backgroundColor: cellInfo.isTarget ? skin.bodyColor : "transparent",
          borderRadius: CELL_SIZE * 0.2,
          padding: 2,
          opacity: cellInfo.isPoisonous ? 0.6 : 1,
        };
        return (
          <View style={cellStyle}>
            <Text style={numberStyle}>{cellInfo.value}</Text>
          </View>
        );
      case "bonus":
        let iconName: any = "star";
        let color = "#FFD700";
        if (cellInfo.bonusType === "TIME_FREEZE") {
          iconName = "snow";
          color = "#00BFFF";
        }
        if (cellInfo.bonusType === "SHRINK") {
          iconName = "contract";
          color = "#9370DB";
        }
        return (
          <Ionicons name={iconName} size={CELL_SIZE * 0.8} color={color} />
        );
      case "obstacle":
        return <Text style={gameStyles.obstacleText}>X</Text>;
      default:
        return null;
    }
  };

  return <View style={gameStyles.cell}>{renderContent()}</View>;
};

export default React.memo(GameCell);
