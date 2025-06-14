import React from "react";
import { Animated, Text } from "react-native";
import { gameStyles } from "@/styles/gameStyles";
import { Achievement } from "@/types/game";

type AchievementNotificationProps = {
  achievement: Achievement | null;
  opacity: Animated.Value;
};

export const AchievementNotification: React.FC<
  AchievementNotificationProps
> = ({ achievement, opacity }) => {
  if (!achievement) return null;

  return (
    <Animated.View style={[gameStyles.achievementContainer, { opacity }]}>
      <Text style={gameStyles.achievementTitle}>アチーブメント達成！</Text>
      <Text style={gameStyles.achievementDesc}>{achievement.name}</Text>
    </Animated.View>
  );
};
