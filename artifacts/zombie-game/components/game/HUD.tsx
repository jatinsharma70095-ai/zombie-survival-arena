import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { GameState } from "./GameEngine";
import { WEAPONS } from "@/context/GameContext";

interface Props { state: GameState; diamonds: number; }

function Bar({ icon, color, value, max }: { icon: string; color: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.barRow}>
      <MaterialCommunityIcons name={icon as any} size={13} color={color} style={styles.barIcon} />
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function HUD({ state, diamonds }: Props) {
  const weapon = WEAPONS[state.currentWeapon];
  const hpColor = state.playerHp / state.maxHp > 0.5 ? Colors.health
    : state.playerHp / state.maxHp > 0.25 ? "#FF8C00" : "#FF3B30";
  const staminaColor = state.staminaExhausted ? "#FF6B35" : Colors.stamina;

  return (
    <>
      {/* ── TOP LEFT: HP + STAMINA ── */}
      <View style={styles.topLeft}>
        <Bar icon="heart" color={hpColor} value={state.playerHp} max={state.maxHp} />
        <Bar icon="lightning-bolt" color={staminaColor} value={state.stamina} max={100} />
      </View>

      {/* ── TOP CENTER: Level + Wave ── */}
      <View style={styles.topCenter} pointerEvents="none">
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {state.level}</Text>
        </View>
        <Text style={styles.waveText}>WAVE {state.wave} / 3</Text>
        <View style={styles.killsRow}>
          <MaterialCommunityIcons name="skull" size={11} color={Colors.textSecondary} />
          <Text style={styles.killsText}>{state.kills}</Text>
        </View>
      </View>

      {/* ── TOP RIGHT: Diamonds + Ammo ── */}
      <View style={styles.topRight}>
        <View style={styles.diamondRow}>
          <MaterialCommunityIcons name="diamond" size={14} color={Colors.diamond} />
          <Text style={styles.diamondText}>{diamonds}</Text>
        </View>
        <View style={[styles.ammoRow, state.isReloading && styles.ammoRowReloading]}>
          {state.isReloading ? (
            <View style={styles.reloadBarWrapper}>
              <View style={[styles.reloadBarFill, { width: `${state.reloadProgress * 100}%` as any }]} />
              <Text style={styles.reloadLabel}>RELOAD</Text>
            </View>
          ) : (
            <>
              <MaterialCommunityIcons name="bullet" size={11} color={Colors.ammo} />
              <Text style={styles.ammoText}>{state.ammo}</Text>
              <Text style={styles.ammoSep}>/</Text>
              <Text style={styles.ammoMaxText}>{state.maxAmmo}</Text>
            </>
          )}
        </View>
        <Text style={styles.weaponNameText}>{weapon.name.toUpperCase()}</Text>
      </View>

      {/* ── EXHAUSTED BADGE ── */}
      {state.staminaExhausted && (
        <View style={styles.exhaustedBadge} pointerEvents="none">
          <Text style={styles.exhaustedText}>EXHAUSTED</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    top: 0,
    left: 12,
    gap: 6,
    width: 140,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  barIcon: { width: 16 },
  barBg: {
    flex: 1,
    height: 7,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },

  topCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 2,
    pointerEvents: "none" as any,
  },
  levelBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  waveText: {
    color: Colors.text,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  killsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  killsText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  topRight: {
    position: "absolute",
    top: 0,
    right: 12,
    alignItems: "flex-end",
    gap: 3,
  },
  diamondRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,212,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.3)",
  },
  diamondText: {
    color: Colors.diamond,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  ammoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,159,10,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,159,10,0.25)",
    minWidth: 70,
  },
  ammoRowReloading: {
    borderColor: Colors.ammo,
    backgroundColor: "rgba(255,159,10,0.2)",
    minWidth: 80,
  },
  ammoText: {
    color: Colors.ammo,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  ammoSep: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  ammoMaxText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  reloadBarWrapper: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
    minWidth: 60,
  },
  reloadBarFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: Colors.ammo,
    borderRadius: 3,
  },
  reloadLabel: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: Colors.ammo,
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    top: -1,
  },
  weaponNameText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },

  exhaustedBadge: {
    position: "absolute",
    bottom: 260,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none" as any,
  },
  exhaustedText: {
    color: "#FF6B35",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    backgroundColor: "rgba(255,107,53,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B35",
    overflow: "hidden",
  },
});
