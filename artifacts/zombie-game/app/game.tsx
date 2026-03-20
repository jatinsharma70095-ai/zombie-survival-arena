import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameContext";
import { GameEngine, GameEngineHandle, GameState } from "@/components/game/GameEngine";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Joystick } from "@/components/game/Joystick";
import { ShootButton } from "@/components/game/ShootButton";
import { HUD } from "@/components/game/HUD";
import { WeaponSelector } from "@/components/game/WeaponSelector";

const INITIAL_STATE: GameState = {
  player: { x: 200, y: 400, angle: 0 },
  playerHp: 100,
  maxHp: 100,
  stamina: 100,
  bullets: [],
  zombies: [],
  explosions: [],
  score: 0,
  kills: 0,
  ammo: 60,
  maxAmmo: 60,
  isReloading: false,
  reloadProgress: 0,
  currentWeapon: "pistol",
  level: 1,
  wave: 0,
  zombiesRemainingInWave: 0,
  gameOver: false,
  victory: false,
  staminaExhausted: false,
};

export default function GameScreen() {
  const params = useLocalSearchParams<{ level?: string }>();
  const level = parseInt(params.level ?? "1", 10);
  const insets = useSafeAreaInsets();
  const { playerStats, completeLevel } = useGame();
  const engineRef = useRef<GameEngineHandle>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [paused, setPaused] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultWon, setResultWon] = useState(false);
  const [resultKills, setResultKills] = useState(0);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    const timer = setTimeout(() => {
      engineRef.current?.startGame(level, playerStats.selectedWeapon);
    }, 100);
    return () => clearTimeout(timer);
  }, [level, playerStats.selectedWeapon]);

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  const handleGameEnd = useCallback((won: boolean, kills: number) => {
    setResultWon(won);
    setResultKills(kills);
    setShowResult(true);
    if (won) {
      completeLevel(level, kills);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [level, completeLevel]);

  const handleMove = useCallback((dx: number, dy: number, sprinting: boolean) => {
    engineRef.current?.movePlayer(dx, dy, sprinting);
  }, []);

  const handleShoot = useCallback(() => {
    engineRef.current?.shootAtNearest();
  }, []);

  const handleReload = useCallback(() => {
    engineRef.current?.reload();
  }, []);

  const handleWeaponSelect = useCallback((weaponId: string) => {
    engineRef.current?.setWeapon(weaponId as any);
  }, []);

  const handlePause = () => {
    setPaused(true);
    engineRef.current?.pauseGame();
  };

  const handleResume = () => {
    setPaused(false);
    engineRef.current?.resumeGame();
  };

  const handleRestart = () => {
    setShowResult(false);
    setPaused(false);
    engineRef.current?.startGame(level, playerStats.selectedWeapon);
  };

  const handleHome = () => {
    router.replace("/");
  };

  const handleNextLevel = () => {
    if (level >= 10) {
      router.replace("/");
      return;
    }
    setShowResult(false);
    router.replace({ pathname: "/game", params: { level: (level + 1).toString() } });
  };

  return (
    <View style={styles.root}>
      {/* Game canvas */}
      <GameEngine
        ref={engineRef}
        onStateChange={handleStateChange}
        onGameEnd={handleGameEnd}
      />
      <GameCanvas state={gameState} />

      {/* HUD */}
      <View
        style={[
          styles.hud,
          { paddingTop: topPad + 8, paddingBottom: botPad },
        ]}
      >
        <HUD state={gameState} diamonds={playerStats.diamonds} />

        {/* Pause Button */}
        <Pressable style={[styles.pauseBtn, { top: topPad + 8 }]} onPress={handlePause}>
          <MaterialCommunityIcons name="pause" size={20} color={Colors.text} />
        </Pressable>

        {/* Weapon Selector */}
        <WeaponSelector
          unlockedWeapons={playerStats.unlockedWeapons}
          selectedWeapon={gameState.currentWeapon}
          onSelect={handleWeaponSelect as any}
        />

        {/* Controls */}
        <View style={[styles.joystickArea, { bottom: botPad + 20 }]}>
          <Joystick onMove={handleMove} side="left" size={110} />
        </View>
        <View style={[styles.shootArea, { bottom: botPad + 20 }]}>
          <ShootButton onShootAt={handleShoot} onReload={handleReload} />
        </View>
      </View>

      {/* Pause overlay */}
      <Modal visible={paused} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <MaterialCommunityIcons name="pause-circle" size={52} color={Colors.text} />
            <Text style={styles.overlayTitle}>PAUSED</Text>
            <Pressable style={styles.overlayBtn} onPress={handleResume}>
              <Text style={styles.overlayBtnText}>RESUME</Text>
            </Pressable>
            <Pressable style={styles.overlaySecBtn} onPress={handleRestart}>
              <Text style={styles.overlaySecText}>RESTART</Text>
            </Pressable>
            <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
              <Text style={styles.overlaySecText}>MAIN MENU</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Result overlay */}
      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.overlay}>
          <LinearGradient
            colors={resultWon ? ["rgba(0,0,0,0.9)", "rgba(0,40,0,0.95)"] : ["rgba(0,0,0,0.9)", "rgba(40,0,0,0.95)"]}
            style={styles.overlayCard}
          >
            <MaterialCommunityIcons
              name={resultWon ? "trophy" : "skull"}
              size={64}
              color={resultWon ? Colors.gold : Colors.accent}
            />
            <Text style={[styles.overlayTitle, { color: resultWon ? Colors.gold : Colors.accent }]}>
              {resultWon ? "LEVEL CLEAR!" : "YOU DIED"}
            </Text>
            {resultWon && (
              <View style={styles.rewardRow}>
                <MaterialCommunityIcons name="diamond" size={18} color={Colors.diamond} />
                <Text style={styles.rewardText}>+{10 + level * 2} diamonds</Text>
              </View>
            )}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="skull" size={18} color={Colors.textSecondary} />
                <Text style={styles.statItemVal}>{resultKills}</Text>
                <Text style={styles.statItemLabel}>kills</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="star" size={18} color={Colors.gold} />
                <Text style={styles.statItemVal}>{gameState.score}</Text>
                <Text style={styles.statItemLabel}>score</Text>
              </View>
            </View>
            {resultWon ? (
              <>
                {level < 10 && (
                  <Pressable style={styles.overlayBtn} onPress={handleNextLevel}>
                    <Text style={styles.overlayBtnText}>NEXT LEVEL →</Text>
                  </Pressable>
                )}
                <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
                  <Text style={styles.overlaySecText}>MAIN MENU</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={[styles.overlayBtn, { backgroundColor: Colors.accent }]} onPress={handleRestart}>
                  <Text style={styles.overlayBtnText}>TRY AGAIN</Text>
                </Pressable>
                <Pressable style={styles.overlaySecBtn} onPress={handleHome}>
                  <Text style={styles.overlaySecText}>MAIN MENU</Text>
                </Pressable>
              </>
            )}
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  hud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "box-none",
  },
  pauseBtn: {
    position: "absolute",
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  joystickArea: {
    position: "absolute",
    left: 24,
  },
  shootArea: {
    position: "absolute",
    right: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    width: "82%",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  overlayTitle: {
    color: Colors.text,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,212,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  rewardText: {
    color: Colors.diamond,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 24,
    marginVertical: 4,
  },
  statItem: {
    alignItems: "center",
    gap: 3,
  },
  statItemVal: {
    color: Colors.text,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statItemLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  overlayBtn: {
    width: "100%",
    paddingVertical: 16,
    backgroundColor: "#1A5C1A",
    borderRadius: 14,
    alignItems: "center",
  },
  overlayBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  overlaySecBtn: {
    width: "100%",
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  overlaySecText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
});
