import { useEffect, useState } from "react";
import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";

// Google公式のテスト広告ユニットID
const adUnitId = __DEV__
  ? "ca-app-pub-3940256099942544/4411468910" // Googleのテスト用インタースティシャル
  : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID!;

export default function useInterstitialAd() {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

  const loadAd = () => {
    if (isAdLoading) return;

    setIsAdLoading(true);
    setIsAdLoaded(false);

    const newInterstitial = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = newInterstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setIsAdLoaded(true);
        setIsAdLoading(false);
        setInterstitial(newInterstitial);
        console.log("Interstitial ad loaded");
        unsubscribeLoaded();
      }
    );

    const unsubscribeError = newInterstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        setIsAdLoaded(false);
        setIsAdLoading(false);
        setInterstitial(null);
        console.error("Interstitial ad error:", error);
        unsubscribeError();
      }
    );

    newInterstitial.load();
  };

  useEffect(() => {
    // 初回ロード
    loadAd();
  }, []);

  const showAd = () => {
    return new Promise<boolean>((resolve) => {
      if (isAdLoaded && interstitial) {
        try {
          // 広告表示後のコールバックを設定
          const unsubscribeClosed = interstitial.addAdEventListener(
            AdEventType.CLOSED,
            () => {
              console.log("Interstitial ad closed");
              // 広告は使い捨てなので、新しい広告をロード
              setIsAdLoaded(false);
              setInterstitial(null);
              loadAd();
              unsubscribeClosed();
              resolve(true);
            }
          );

          interstitial.show();
        } catch (error) {
          console.error("Error showing interstitial ad:", error);
          resolve(false);
        }
      } else {
        console.log("Interstitial ad not loaded yet");
        // 広告がロードされていない場合は、ロードを試みる
        if (!isAdLoading) {
          loadAd();
        }
        resolve(false);
      }
    });
  };

  return {
    showAd,
    isAdLoaded,
  };
}
