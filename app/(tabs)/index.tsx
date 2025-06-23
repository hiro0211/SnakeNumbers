import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdBanner from "@/components/AdBanner";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [highScore, setHighScore] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    loadHighScore();
  }, []);

  // 画面がフォーカスされた時にハイスコアを再読み込み
  useFocusEffect(
    useCallback(() => {
      loadHighScore();
    }, [])
  );

  const loadHighScore = async () => {
    try {
      const score = await AsyncStorage.getItem("numberSnakeHighScore");
      if (score !== null) {
        setHighScore(parseInt(score));
      }
    } catch (error) {
      console.error("Failed to load high score:", error);
    }
  };

  const startGame = () => {
    router.push("/game");
  };

  const showInstructions = () => {
    setShowHowToPlay(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Snake</Text>
        <Text style={styles.titleSnake}>Numbers</Text>
        <Text style={styles.subtitle}>🐍 Eat the numbers in order!</Text>
      </View>

      {/* High Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>High Score</Text>
        <Text style={styles.scoreValue}>{highScore}</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.playButton} onPress={startGame}>
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.instructionButton}
          onPress={showInstructions}
        >
          <Text style={styles.instructionButtonText}>How to Play</Text>
        </TouchableOpacity>
      </View>

      {/* Decoration */}
      <View style={styles.decoration}>
        <Text style={styles.decorationText}>1 2 3 4 5 6 7 8 9</Text>
      </View>

      {/* バナー広告 */}
      <AdBanner />

      {/* How To Play Dialog */}
      {showHowToPlay && (
        <View style={styles.dialogOverlay}>
          <View style={styles.howToPlayDialog}>
            <Text style={styles.howToPlayTitle}>How To Play</Text>

            <View style={styles.howToPlayContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🎯</Text>
                <Text style={styles.sectionTitle}>Objective:</Text>
              </View>
              <Text style={styles.sectionText}>
                Eat numbers in sequence (1→2→3...→9→1)
              </Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🎮</Text>
                <Text style={styles.sectionTitle}>Controls:</Text>
              </View>
              <Text style={styles.sectionText}>
                • Swipe or tap to change direction
              </Text>
              <Text style={styles.sectionText}>
                • Avoid walls and obstacles
              </Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🔢</Text>
                <Text style={styles.sectionTitle}>Numbers:</Text>
              </View>
              <Text style={styles.sectionText}>
                • Yellow: Target number to eat
              </Text>
              <Text style={styles.sectionText}>• Gray: Other numbers</Text>
              <Text style={styles.sectionText}>• Red: Poisonous (avoid!)</Text>
              <Text style={styles.sectionText}>• Blinking: Time-limited</Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>⭐</Text>
                <Text style={styles.sectionTitle}>Bonuses:</Text>
              </View>
              <Text style={styles.sectionText}>• ⭐ Score multiplier</Text>
              <Text style={styles.sectionText}>• ❄️ Time freeze</Text>
              <Text style={styles.sectionText}>• ✂️ Shrink snake</Text>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🏆</Text>
                <Text style={styles.sectionTitle}>Scoring:</Text>
              </View>
              <Text style={styles.sectionText}>
                • Eat correct numbers for points
              </Text>
              <Text style={styles.sectionText}>
                • Build streaks for bonus multipliers
              </Text>
              <Text style={styles.sectionText}>
                • Unlock achievements and skins
              </Text>
            </View>

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => setShowHowToPlay(false)}
            >
              <Text style={styles.gotItButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#4ade80",
    textShadowColor: "rgba(74, 222, 128, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleSnake: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fbbf24",
    textShadowColor: "rgba(251, 191, 36, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginTop: -10,
  },
  subtitle: {
    fontSize: 18,
    color: "#94a3b8",
    marginTop: 10,
    textAlign: "center",
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  scoreLabel: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fbbf24",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "#4ade80",
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 20,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a2e",
    textAlign: "center",
  },
  instructionButton: {
    backgroundColor: "transparent",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#94a3b8",
  },
  instructionButtonText: {
    fontSize: 18,
    color: "#94a3b8",
    textAlign: "center",
  },
  decoration: {
    position: "absolute",
    bottom: 50,
    opacity: 0.3,
  },
  decorationText: {
    fontSize: 24,
    color: "#4ade80",
    letterSpacing: 8,
  },
  dialogOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  howToPlayDialog: {
    backgroundColor: "#1f2937",
    borderRadius: 15,
    padding: 20,
    borderWidth: 3,
    borderColor: "#22c55e",
    maxWidth: 350,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 15,
  },
  howToPlayTitle: {
    color: "#22c55e",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  howToPlayContent: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionText: {
    color: "#e5e7eb",
    fontSize: 14,
    marginBottom: 3,
    marginLeft: 24,
  },
  gotItButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignSelf: "center",
  },
  gotItButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
