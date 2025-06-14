import { StyleSheet, Dimensions } from "react-native";
import { CELL_SIZE, GRID_SIZE } from "@/constants/game";

const { width, height } = Dimensions.get("window");

export const gameStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  // GameHeader
  headerContainer: {
    position: "absolute",
    top: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e0e0e0",
    fontFamily: "sans-serif-condensed",
  },
  pauseButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 50,
  },
  // ScoreBoard
  scoreBoardContainer: {
    width: "90%",
    padding: 10,
    marginTop: 90,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreLabel: {
    color: "#a0a0c0",
    fontSize: 14,
  },
  scoreValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  nextNumberContainer: {
    marginTop: 5,
    paddingVertical: 5,
    paddingHorizontal: 15,
    backgroundColor: "#ffc107",
    borderRadius: 20,
  },
  nextNumberText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusEffectContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  statusEffect: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  statusText: {
    color: "#ffffff",
    marginLeft: 5,
  },
  // SkinSelector
  skinSelectorContainer: {
    marginBottom: 10,
  },
  skinScrollView: {
    paddingHorizontal: 10,
  },
  skinButton: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
  },
  skinName: {
    color: "#fff",
    fontWeight: "bold",
  },
  lockIconContainer: {
    position: "absolute",
    right: -5,
    top: -5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    padding: 2,
  },
  // GameGrid
  gridContainer: {
    width: GRID_SIZE * CELL_SIZE,
    height: GRID_SIZE * CELL_SIZE,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  // GameCell
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.05)",
  },
  numberText: {
    fontSize: CELL_SIZE * 0.7,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  obstacleText: {
    color: "#ff4f4f",
    fontSize: CELL_SIZE * 0.8,
  },
  // AchievementNotification
  achievementContainer: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 20,
  },
  achievementTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  achievementDesc: {
    color: "white",
    fontSize: 14,
  },
  // PauseOverlay
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  overlayText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  // GameOverOverlay
  gameOverContainer: {
    alignItems: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#FFC107",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#1a1a2e",
    fontSize: 18,
    fontWeight: "bold",
  },
});
