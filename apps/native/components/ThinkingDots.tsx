import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { theme } from "@/lib/theme";

// Streaming indicator: three ink dots breathing in sequence. A React Native
// take on dotted thought-orb loaders (thinking-orbs); Animated transforms
// only, so it runs on the native driver and costs nothing.
export function ThinkingDots({ size = 5 }: { size?: number }) {
  const dots = [useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={styles.row} accessibilityLabel="Thinking">
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2 },
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.9] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  dot: { backgroundColor: theme.colors.slate },
});
