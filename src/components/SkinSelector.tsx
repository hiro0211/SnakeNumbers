import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { gameStyles } from "@/styles/gameStyles";
import { SNAKE_SKINS } from "@/constants/game";

type SkinSelectorProps = {
  currentSkinId: string;
  level: number;
  onChangeSkin: (skinId: string) => void;
};

export const SkinSelector: React.FC<SkinSelectorProps> = ({
  currentSkinId,
  level,
  onChangeSkin,
}) => {
  return (
    <View style={gameStyles.skinSelectorContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={gameStyles.skinScrollView}
      >
        {SNAKE_SKINS.map((skin) => {
          const isUnlocked = level >= skin.unlockLevel;
          const isSelected = skin.id === currentSkinId;
          return (
            <TouchableOpacity
              key={skin.id}
              disabled={!isUnlocked}
              onPress={() => onChangeSkin(skin.id)}
              style={[
                gameStyles.skinButton,
                {
                  backgroundColor: isUnlocked ? skin.bodyColor : "#555",
                  borderColor: isSelected ? "#fff" : "transparent",
                  opacity: isUnlocked ? 1 : 0.6,
                },
              ]}
            >
              <Text style={gameStyles.skinName}>{skin.name}</Text>
              {!isUnlocked && (
                <View style={gameStyles.lockIconContainer}>
                  <Ionicons name="lock-closed" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
