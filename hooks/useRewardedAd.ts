import { useEffect, useState } from "react";
import {
  RewardedAd,
  RewardedAdEventType,
} from "react-native-google-mobile-ads";

// Google公式のテスト広告ユニットID
const adUnitId = __DEV__
  ? "ca-app-pub-3940256099942544/1712485313" // Googleのテスト用リワード
  : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID!;

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export default function useRewardedAd() {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setIsAdLoaded(true);
        setIsAdLoading(false);
        console.log("Rewarded ad loaded");
      }
    );

    // Load an ad
    if (!isAdLoading && !isAdLoaded) {
      setIsAdLoading(true);
      rewarded.load();
    }

    return () => {
      unsubscribeLoaded();
    };
  }, [isAdLoading, isAdLoaded]);

  const showAd = () => {
    return new Promise<boolean>((resolve) => {
      if (isAdLoaded) {
        try {
          // タイムアウト設定（広告が完了しない場合の対策）
          const timeout = setTimeout(() => {
            console.log("Rewarded ad timeout - no reward earned");
            resolve(false);
          }, 30000); // 30秒でタイムアウト

          // 広告視聴完了の検知を設定
          const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            (reward) => {
              console.log("Rewarded ad earned reward:", reward);
              clearTimeout(timeout); // タイムアウトをクリア
              unsubscribeEarned();
              resolve(true); // 報酬を獲得した場合のみ成功
            }
          );

          rewarded.show();
          // 広告表示後の状態更新
          setIsAdLoaded(false);
          // 次の広告をロード
          setTimeout(() => {
            setIsAdLoading(true);
            rewarded.load();
          }, 1000);
        } catch (error) {
          console.error("Error showing rewarded ad:", error);
          resolve(false);
        }
      } else {
        console.log("Rewarded ad not loaded yet");
        resolve(false);
        // 広告がロードされていない場合は、再度ロードを試みる
        if (!isAdLoading) {
          setIsAdLoading(true);
          rewarded.load();
        }
      }
    });
  };

  return {
    showAd,
    isAdLoaded,
  };
}
