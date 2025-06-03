import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

interface AdBannerProps {
  adUnitId?: string;
  size?: BannerAdSize;
}

export default function AdBanner({
  // テスト用ID（開発時に使用）
  // 本番用IDは 'ca-app-pub-6259770208793369/YOUR_BANNER_UNIT_ID' に置き換えてください
  adUnitId = __DEV__
    ? "ca-app-pub-3940256099942544/6300978111"
    : "ca-app-pub-6259770208793369/YOUR_BANNER_UNIT_ID",
  size = BannerAdSize.BANNER,
}: AdBannerProps) {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={size}
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
    marginVertical: 10,
  },
});
