import React from "react";
import { View, StyleSheet, Dimensions, Text } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

const { width } = Dimensions.get("window");

// .envファイルから本番用の広告ユニットIDを読み込む
const adUnitId = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID!;

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "#1a1a2e", // 背景色をアプリに合わせる
    minHeight: 50,
  },
});
