import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGame, MAX_LEVELS } from "@/context/GameContext";

function getDiamondReward(level: number): number {
  return Math.round(30 + (level - 1) * (50 / 49));
}

export default function LevelSelectScreen() {
  const insets = useSafeAreaInsets();
  const { playerStats } = useGame();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLevel = (level: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/game", params: { level: level.toString() } });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SELECT LEVEL</Text>
        <View style={styles.diamondBadge}>
          <Text style={styles.diamondEmoji}>💎</Text>
          <Text style={styles.diamondText}>{playerStats.diamonds}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.grid, { paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map((level) => {
          const locked = level > playerStats.maxLevelReached;
          const completed = level < playerStats.maxLevelReached;
          const current = level === playerStats.currentLevel;
          const toughPct = Math.round((level - 1) * 8);
          const reward = getDiamondReward(level);

          return (
            <Pressable
              key={level}
              style={({ pressed }) => [
                styles.levelCard,
                completed && styles.levelCardCompleted,
                current && styles.levelCardCurrent,
                locked && styles.levelCardLocked,
                pressed && !locked && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => !locked && handleLevel(level)}
              disabled={locked}
            >
              {/* Level Number */}
              <View style={styles.levelNumWrapper}>
                {locked ? (
                  <Text style={styles.lockEmoji}>🔒</Text>
                ) : (
                  <Text
                    style={[
                      styles.levelNum,
                      completed && { color: Colors.green },
                      current && { color: Colors.accent },
                    ]}
                  >
                    {level}
                  </Text>
                )}
              </View>

              {/* Info */}
              <View style={styles.levelInfo}>
                <Text
                  style={[
                    styles.levelName,
                    locked && { color: Colors.textMuted },
                  ]}
                >
                  {getLevelName(level)}
                </Text>
                <Text style={styles.toughLabel}>
                  {locked ? "LOCKED" : `+${toughPct}% difficulty`}
                </Text>
                <View style={styles.waveRow}>
                  {!locked && (
                    <>
                      <View style={styles.waveDot} />
                      <View style={styles.waveDot} />
                      <View style={styles.waveDot} />
                      <Text style={styles.waveLabel}>3 waves</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Reward */}
              <View style={styles.rewardCol}>
                {!locked && (
                  <>
                    <View style={styles.rewardRow}>
                      <Text style={styles.rewardEmoji}>💎</Text>
                      <Text style={styles.rewardText}>+{reward}</Text>
                    </View>
                    {completed && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                    {current && !completed && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentText}>NEXT</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function getLevelName(level: number): string {
  const names = [
    "Dead Quiet",      "First Blood",     "Rising Tide",     "Swarm Season",    "Red Dawn",
    "The Siege",       "Blackout",        "Nightmare",       "Apocalypse",      "Final Stand",
    "Cursed Ground",   "Bone Crusher",    "Night Terror",    "Bloodbath",       "The Infected",
    "Zero Hour",       "Dark Harvest",    "Grave Danger",    "Death March",     "No Mercy",
    "Hellfire",        "The Outbreak",    "Mass Grave",      "Skull Island",    "Last Breath",
    "Undead Legion",   "The Plague",      "Crimson Wave",    "End Times",       "Flesh Horde",
    "Devil's Gate",    "Rotten Core",     "Midnight Raid",   "The Fallen",      "Death's Door",
    "Armageddon",      "Chaos Engine",    "Viral Surge",     "Soul Crusher",    "Abyss",
    "Oblivion",        "Ragnarok",        "The Final Horde", "Annihilation",    "Extinction",
    "Doomsday",        "Last Man",        "Point Zero",      "Beyond Hope",     "The End",
  ];
  return names[level - 1] ?? `Level ${level}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 32, color: Colors.text, lineHeight: 36 },
  headerTitle: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  diamondBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,212,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  diamondEmoji: { fontSize: 13 },
  diamondText: {
    color: Colors.diamond,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: { flex: 1 },
  grid: { padding: 16, gap: 8 },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  levelCardCompleted: {
    borderColor: "rgba(76, 217, 100, 0.3)",
    backgroundColor: "rgba(76, 217, 100, 0.05)",
  },
  levelCardCurrent: {
    borderColor: "rgba(255,59,48,0.4)",
    backgroundColor: "rgba(255,59,48,0.07)",
  },
  levelCardLocked: { opacity: 0.5 },
  levelNumWrapper: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  levelNum: {
    color: Colors.text,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  lockEmoji: { fontSize: 20 },
  levelInfo: { flex: 1, gap: 2 },
  levelName: {
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  toughLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  waveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.accent,
    opacity: 0.6,
  },
  waveLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginLeft: 2,
  },
  rewardCol: { alignItems: "flex-end", gap: 5 },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rewardEmoji: { fontSize: 12 },
  rewardText: {
    color: Colors.diamond,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  checkIcon: {
    fontSize: 20,
    color: Colors.green,
    fontFamily: "Inter_700Bold",
  },
  currentBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentText: {
    color: "#FFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
