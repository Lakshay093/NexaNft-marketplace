import { useEffect, useRef } from 'react';
import { Animated, View, AccessibilityInfo } from 'react-native';
import { colors } from '../constants/theme';
export function SkeletonLoader() {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    let disposed = false;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!reduced && !disposed) {
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
          ]),
        );
        animation.start();
      }
    });
    return () => {
      disposed = true;
      animation?.stop();
    };
  }, [opacity]);
  return (
    <Animated.View
      accessibilityLabel="Loading artwork"
      style={{ opacity, flexDirection: 'row', gap: 14, paddingVertical: 20 }}
    >
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            borderRadius: 20,
            padding: 12,
            backgroundColor: colors.surface,
            gap: 12,
          }}
        >
          <View style={{ aspectRatio: 1, borderRadius: 14, backgroundColor: colors.raised }} />
          <View
            style={{ height: 16, width: '75%', backgroundColor: colors.raised, borderRadius: 6 }}
          />
          <View
            style={{ height: 12, width: '50%', backgroundColor: colors.raised, borderRadius: 6 }}
          />
        </View>
      ))}
    </Animated.View>
  );
}
