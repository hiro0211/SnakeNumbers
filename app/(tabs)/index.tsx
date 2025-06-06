import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// import AdBanner from "@/components/AdBanner";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const [highScore, setHighScore] = useState(0);

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
    Alert.alert(
      "遊び方",
      "【基本ルール】\n" +
        "🐍 ヘビを操作して、数字を順番通り（1→2→3...）に食べていくゲームです。\n" +
        "📱 スワイプか画面タップでヘビを動かせます。\n" +
        "🎯 次に食べるべき数字は金色にハイライトされます。\n" +
        "❌ 間違った数字を食べたり、壁や自分自身にぶつかるとゲームオーバーです。\n\n" +
        "【ゲームの進め方】\n" +
        "📈 スコアを稼いでレベルアップ！レベルが上がると新しいスキンが解放されます。\n" +
        "🔥 連続で数字を食べるとストリークボーナス！スコア倍率がアップします。\n\n" +
        "【ボーナスアイテム】\n" +
        "⭐ スコア倍増: 5回だけスコアが2倍に！\n" +
        "❄️ 時間停止: 3秒間ヘビがストップ！\n" +
        "✂️ シュリンク: ヘビの体が半分に！\n\n" +
        "【危険な要素】\n" +
        "🧱 障害物: レベル3から出現。ぶつからないように！\n" +
        "⏰ 時間制限数字: レベル8から出現。消える前に急いでゲット！\n" +
        "💀 毒数字: レベル15から出現。絶対に食べないで！\n\n" +
        "🏆 アチーブメントを達成して、ハイスコアを目指そう！",
      [{ text: "OK", style: "default" }]
    );
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

      {/* バナー広告（一時的に無効化） */}
      {/* <AdBanner /> */}

      {/* Decoration */}
      <View style={styles.decoration}>
        <Text style={styles.decorationText}>1 2 3 4 5 6 7 8 9</Text>
      </View>
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
});
