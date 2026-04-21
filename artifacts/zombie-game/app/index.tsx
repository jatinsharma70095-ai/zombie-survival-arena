import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameContext";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { playerStats, isLoaded } = useGame();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePlay = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/level-select");
  };

  const handleShop = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/shop");
  };

  const handleArsenal = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/arsenal");
  };

  if (!isLoaded) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ fontSize: 48 }}>💀</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A0A0F", "#1A0A0A", "#0A0A0F"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <View style={styles.statChip}>
          <Text style={styles.chipEmoji}>💎</Text>
          <Text style={styles.statValue}>{playerStats.diamonds}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.chipEmoji}>💀</Text>
          <Text style={styles.statValue}>{playerStats.totalKills}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={styles.chipEmoji}>🏆</Text>
          <Text style={styles.statValue}>LV{playerStats.maxLevelReached}</Text>
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>💀</Text>
        <Text style={styles.titleTop}>ZOMBIE</Text>
        <Text style={styles.titleBottom}>SURVIVAL</Text>
        <Text style={styles.subtitle}>Survive the apocalypse</Text>
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: botPad + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={handlePlay}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentDark]}
            style={styles.playGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.playText}>PLAY</Text>
          </LinearGradient>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable
            style={({ pressed }) => [styles.secBtn, pressed && { opacity: 0.7 }]}
            onPress={handleArsenal}
          >
            <Text style={styles.secEmoji}>🔫</Text>
            <Text style={styles.secLabel}>Arsenal</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secBtn, pressed && { opacity: 0.7 }]}
            onPress={handleShop}
          >
            <Text style={styles.secEmoji}>💎</Text>
            <Text style={styles.secLabel}>Shop</Text>
          </Pressable>
        </View>

        {/* Last session info */}
        {playerStats.gamesPlayed > 0 && (
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionText}>
              {playerStats.gamesPlayed} runs · Level {playerStats.currentLevel} / 50
            </Text>
          </View>
        )}

        {/* Credits */}
        <View style={styles.credits}>
          <Text style={styles.creditsText}>Designed & Developed by Jatin Sharma</Text>
          <Text style={styles.creditsSubText}>Powered by Claude AI</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipEmoji: { fontSize: 13 },
  statValue: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  titleTop: {
    color: Colors.text,
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    letterSpacing: 8,
    textAlign: "center",
    lineHeight: 56,
  },
  titleBottom: {
    color: Colors.accent,
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    letterSpacing: 8,
    textAlign: "center",
    lineHeight: 56,
    marginBottom: 12,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  actions: {
    paddingHorizontal: 24,
    gap: 14,
  },
  playBtn: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  playGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  playIcon: { fontSize: 24, color: "#FFF" },
  playText: {
    color: "#FFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  secBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 14,
  },
  secEmoji: { fontSize: 20 },
  secLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  sessionInfo: {
    alignItems: "center",
  },
  sessionText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  credits: {
    alignItems: "center",
    paddingTop: 4,
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 10,
  },
  creditsText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  creditsSubText: {
    color: "rgba(255,255,255,0.18)",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },
});
