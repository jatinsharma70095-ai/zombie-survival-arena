import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, StyleSheet, Text, Pressable, Platform, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGame, MAX_LEVELS } from "@/context/GameContext";
import { GameEngine, GameEngineHandle, GameState } from "@/components/game/GameEngine";
import { GameCanvas } from "@/components/game/GameCanvas";
import { GameCanvasHTML } from "@/components/game/GameCanvasHTML";
import { Joystick } from "@/components/game/Joystick";
import { ShootButton } from "@/components/game/ShootButton";
import { HUD } from "@/components/game/HUD";
import { WeaponSelector } from "@/components/game/WeaponSelector";

const INITIAL_STATE: GameState = {
  player: { x: 200, y: 400, angle: 0 },
  playerHp: 100, maxHp: 100, stamina: 100,
  bullets: [], zombies: [], explosions: [],
  score: 0, kills: 0, ammo: 60, maxAmmo: 60,
  isReloading: false, reloadProgress: 0,
  currentWeapon: "pistol",
  level: 1, wave: 0, zombiesRemainingInWave: 0,
  gameOver: false, victory: false, staminaExhausted: false,
  lastDamageTime: 0, lastShotTime: 0,
  lastShotAngle: 0, lastShotX: 0, lastShotY: 0,
  recentKills: [],
  killStreakBonus: 0,
  isEndless: false,
  endlessRound: 0,
  hordeActive: false,
};

// Inject touch-action: none globally on web
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after { touch-action: none !important; }
    body, html { overflow: hidden !important; overscroll-behavior: none !important; }
    * { -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
  `;
  document.head.appendChild(style);
  const isInteractive = (el: EventTarget | null) => {
    const node = el as HTMLElement | null;
    if (!node || !node.closest) return false;
    return !!node.closest(
      '[role="button"], [role="link"], button, a, input, textarea, select, [data-interactive="true"]'
    );
  };
  document.addEventListener("touchmove", (e) => {
    if (isInteractive(e.target)) return;
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchstart", (e) => {
    if (isInteractive(e.target)) return;
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    e.preventDefault();
  }, { passive: false });
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ level?: string }>();
  const levelParam = parseInt(params.level ?? "1", 10);
  const isEndless = levelParam > MAX_LEVELS;
  const level = isEndless ? MAX_LEVELS : levelParam;
  const insets = useSafeAreaInsets();
  const { playerStats, completeLevel, addDiamonds, saveEndlessScore } = useGame();
  const engineRef = useRef<GameEngineHandle>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [paused, setPaused] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultWon, setResultWon] = useState(false);
  const [resultKills, setResultKills] = useState(0);
  const [resultDiamonds, setResultDiamonds] = useState(0);
  const [resultScore, setResultScore] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [hordeWarning, setHordeWarning] = useState(false);
  const hordeOpacity = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom;

  useEffect(() => {
    const t = setTimeout(
      () => engineRef.current?.startGame(level, playerStats.selectedWeapon, isEndless),
      100
    );
    return () => clearTimeout(t);
  }, [level, playerStats.selectedWeapon, isEndless]);

  const handleStateChange = useCallback((s: GameState) => setGameState(s), []);

  const handleKillStreak = useCallback((bonus: number) => {
    setStreakCount(prev => prev + 1);
    addDiamonds(bonus);
  }, [addDiamonds]);

  const handleHorde = useCallback(() => {
    setHordeWarning(true);
    Animated.sequence([
      Animated.timing(hordeOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(hordeOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => setHordeWarning(false));
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [hordeOpacity]);

  const handleGameEnd = useCallback((won: boolean, kills: number, streakBonus: number, score: number) => {
    setResultWon(won); setResultKills(kills); setResultScore(score); setShowResult(true);
    if (won) {
      if (isEndless) {
        // Endless mode: you never "win" — only die
      } else {
        const total = completeLevel(level, kills, streakBonus);
        setResultDiamonds(total);
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      if (isEndless) saveEndlessScore(score);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [level, completeLevel, isEndless, saveEndlessScore]);

  const handleMove = useCallback((dx: number, dy: number, sprinting: boolean) => {
    engineRef.current?.movePlayer(dx, dy, sprinting);
  }, []);

  const handleShoot = useCallback(() => { engineRef.current?.shootAtNearest(); }, []);
  const handleReload = useCallback(() => { engineRef.current?.reload(); }, []);

  const handleWeaponSelect = useCallback((weaponId: string) => {
    engineRef.current?.setWeapon(weaponId as any);
  }, []);

  const handlePause = () => { setPaused(true); engineRef.current?.pauseGame(); };
  const handleResume = () => { setPaused(false); engineRef.current?.resumeGame(); };
  const handleRestart = () => {
    setShowResult(false); setPaused(false); setStreakCount(0);
    engineRef.current?.startGame(level, playerStats.selectedWeapon, isEndless);
  };
  const handleHome = () => router.replace("/");
  const handleNextLevel = () => {
    setShowResult(false); setStreakCount(0);
    if (level >= MAX_LEVELS) {
      // Enter endless mode
      router.replace({ pathname: "/game", params: { level: (MAX_LEVELS + 1).toString() } });
    } else {
      router.replace({ pathname: "/game", params: { level: (level + 1).toString() } });
    }
  };

  const isLastNormal = level >= MAX_LEVELS;

  return (
    <View style={styles.root}>
      <GameEngine
        ref={engineRef}
        onStateChange={handleStateChange}
        onGameEnd={handleGameEnd}
        onKillStreak={handleKillStreak}
        onHorde={handleHorde}
      />

      {Platform.OS === "web"
        ? <GameCanvasHTML state={gameState} />
        : <GameCanvas state={gameState} />
      }

      {/* HUD layer */}
      <View style={[styles.hud, { paddingTop: topPad + 6 }]} pointerEvents="box-none">
        <HUD state={gameState} diamonds={playerStats.diamonds} />

        {isEndless && (
          <View style={styles.endlessBadge} pointerEvents="none">
            <Text style={styles.endlessText}>♾ ENDLESS</Text>
          </View>
        )}

        <Pressable style={[styles.pauseBtn, { top: topPad + 6 }]} onPress={handlePause}>
          <Text style={styles.pauseIcon}>⏸</Text>
        </Pressable>

        {streakCount > 0 && (
          <View style={styles.streakBadge} pointerEvents="none">
            <Text style={styles.streakText}>🔥 KILL STREAK +10 💎</Text>
          </View>
        )}

        {/* Horde warning */}
        {hordeWarning && (
          <Animated.View style={[styles.hordeWarning, { opacity: hordeOpacity }]} pointerEvents="none">
            <Text style={styles.hordeText}>⚠ HORDE INCOMING! ⚠</Text>
            <Text style={styles.hordeSubText}>RUN OR FIGHT</Text>
          </Animated.View>
        )}

        <WeaponSelector
          unlockedWeapons={playerStats.unlockedWeapons}
          selectedWeapon={gameState.currentWeapon}
          onSelect={handleWeaponSelect as any}
        />

        <View style={[styles.joystickArea, { bottom: botPad + 18 }]}>
          <Joystick onMove={handleMove} side="left" size={112} />
        </View>

        <View style={[styles.shootArea, { bottom: botPad + 18 }]}>
          <ShootButton onShootAt={handleShoot} onReload={handleReload} />
        </View>
      </View>

      {/* Pause overlay */}
      {paused && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>⏸</Text>
            <Text style={styles.overlayTitle}>PAUSED</Text>
            <Pressable style={styles.overlayBtn} onPress={handleResume}>
              <Text style={styles.overlayBtnText}>▶ RESUME</Text>
            </Pressable>
            <Pressable style={styles.overlaySecBtn} onPress={handleRestart}>
              <Text style={styles.overlaySecText}>↺ RESTART</Text>
            </Pressable>
            <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
              <Text style={styles.overlaySecText}>🏠 MAIN MENU</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Result overlay */}
      {showResult && (
        <View style={styles.overlay} pointerEvents="auto">
          <LinearGradient
            colors={resultWon ? ["rgba(0,0,0,0.92)", "rgba(0,30,0,0.96)"] : ["rgba(0,0,0,0.92)", "rgba(40,0,0,0.96)"]}
            style={styles.overlayCard}
          >
            {isEndless ? (
              <>
                <Text style={styles.overlayEmoji}>♾</Text>
                <Text style={[styles.overlayTitle, { color: Colors.gold }]}>ENDLESS RUN ENDED</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statEmoji}>💀</Text>
                    <Text style={styles.statVal}>{resultKills}</Text>
                    <Text style={styles.statLabel}>kills</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statEmoji}>⭐</Text>
                    <Text style={styles.statVal}>{resultScore}</Text>
                    <Text style={styles.statLabel}>score</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statEmoji}>🏆</Text>
                    <Text style={styles.statVal}>{playerStats.endlessBestScore}</Text>
                    <Text style={styles.statLabel}>best</Text>
                  </View>
                </View>
                <Pressable style={[styles.overlayBtn, { backgroundColor: "#4A0A6C" }]} onPress={handleRestart}>
                  <Text style={styles.overlayBtnText}>♾ TRY AGAIN</Text>
                </Pressable>
                <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
                  <Text style={styles.overlaySecText}>🏠 MAIN MENU</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.overlayEmoji}>{resultWon ? "🏆" : "💀"}</Text>
                <Text style={[styles.overlayTitle, { color: resultWon ? Colors.gold : Colors.accent }]}>
                  {resultWon ? "LEVEL CLEAR!" : "YOU DIED"}
                </Text>
                {resultWon && (
                  <View style={styles.rewardRow}>
                    <Text style={styles.rewardText}>💎 +{resultDiamonds} diamonds</Text>
                  </View>
                )}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statEmoji}>💀</Text>
                    <Text style={styles.statVal}>{resultKills}</Text>
                    <Text style={styles.statLabel}>kills</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statEmoji}>⭐</Text>
                    <Text style={styles.statVal}>{resultScore}</Text>
                    <Text style={styles.statLabel}>score</Text>
                  </View>
                  {gameState.killStreakBonus > 0 && (
                    <View style={styles.statItem}>
                      <Text style={styles.statEmoji}>🔥</Text>
                      <Text style={styles.statVal}>+{gameState.killStreakBonus}</Text>
                      <Text style={styles.statLabel}>streak</Text>
                    </View>
                  )}
                </View>
                {resultWon ? (
                  <>
                    <Pressable
                      style={[styles.overlayBtn, isLastNormal ? { backgroundColor: "#4A0A6C" } : {}]}
                      onPress={handleNextLevel}
                    >
                      <Text style={styles.overlayBtnText}>
                        {isLastNormal ? "♾ ENTER ENDLESS MODE" : "NEXT LEVEL →"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
                      <Text style={styles.overlaySecText}>🏠 MAIN MENU</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable style={[styles.overlayBtn, { backgroundColor: Colors.accent }]} onPress={handleRestart}>
                      <Text style={styles.overlayBtnText}>↺ TRY AGAIN</Text>
                    </Pressable>
                    <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
                      <Text style={styles.overlaySecText}>🏠 MAIN MENU</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808" },
  hud: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: "box-none",
  },
  pauseBtn: {
    position: "absolute", right: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  pauseIcon: { fontSize: 17, color: Colors.text, lineHeight: 20 },
  endlessBadge: {
    position: "absolute",
    top: 60, left: 0, right: 0,
    alignItems: "center",
  },
  endlessText: {
    color: "#BF5AF2",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    backgroundColor: "rgba(100,0,180,0.25)",
    paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(191,90,242,0.4)",
    overflow: "hidden",
  },
  streakBadge: {
    position: "absolute",
    top: 90,
    left: 0, right: 0,
    alignItems: "center",
    pointerEvents: "none" as any,
  },
  streakText: {
    color: "#FFD60A",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,214,10,0.4)",
    overflow: "hidden",
  },
  hordeWarning: {
    position: "absolute",
    top: "28%",
    left: 0, right: 0,
    alignItems: "center",
    pointerEvents: "none" as any,
    gap: 4,
  },
  hordeText: {
    color: "#FF3B30",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2, borderColor: "rgba(255,59,48,0.6)",
    overflow: "hidden",
  },
  hordeSubText: {
    color: "rgba(255,100,80,0.8)",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 4,
  },
  joystickArea: { position: "absolute", left: 22 },
  shootArea: { position: "absolute", right: 22 },
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center",
    zIndex: 9999,
  },
  overlayCard: {
    width: "82%", borderRadius: 24, padding: 32,
    alignItems: "center", gap: 16,
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    overflow: "hidden",
  },
  overlayEmoji: { fontSize: 52, lineHeight: 60 },
  overlayTitle: {
    color: Colors.text, fontSize: 26,
    fontFamily: "Inter_700Bold", letterSpacing: 3,
  },
  rewardRow: {
    backgroundColor: "rgba(0,212,255,0.12)",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,212,255,0.2)",
  },
  rewardText: { color: Colors.diamond, fontSize: 18, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 24, marginVertical: 4 },
  statItem: { alignItems: "center", gap: 3 },
  statEmoji: { fontSize: 18, lineHeight: 22 },
  statVal: { color: Colors.text, fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { color: Colors.textSecondary, fontSize: 11, fontFamily: "Inter_400Regular" },
  overlayBtn: {
    width: "100%", paddingVertical: 16,
    backgroundColor: "#1A5C1A", borderRadius: 14, alignItems: "center",
  },
  overlayBtnText: {
    color: Colors.text, fontSize: 16,
    fontFamily: "Inter_700Bold", letterSpacing: 2,
  },
  overlaySecBtn: {
    width: "100%", paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  overlaySecText: {
    color: Colors.textSecondary, fontSize: 14,
    fontFamily: "Inter_600SemiBold", letterSpacing: 1.5,
  },
});
