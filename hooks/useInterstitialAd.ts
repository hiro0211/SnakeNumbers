import { useEffect, useState } from "react";
import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";

const adUnitId = __DEV__
  ? "ca-app-pub-3940256099942544/1033173712" // テスト用ID
  : "ca-app-pub-6259770208793369/2564047567"; // 本番用ID

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export default function useInterstitialAd() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setIsLoaded(true);
      }
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setIsLoaded(false);
        // 新しい広告をロード
        interstitial.load();
      }
    );

    // 初回ロード
    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const showAd = () => {
    if (isLoaded) {
      interstitial.show();
    }
  };

  return {
    isLoaded,
    showAd,
  };
}
