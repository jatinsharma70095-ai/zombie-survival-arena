import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { GameState } from "./GameEngine";
import { WEAPONS } from "@/context/GameContext";

interface Props {
  state: GameState;
  diamonds: number;
}

function BarRow({
  icon,
  color,
  value,
  max,
  label,
}: {
  icon: string;
  color: string;
  value: number;
  max: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.barRow}>
      <MaterialCommunityIcons
        name={icon as any}
        size={14}
        color={color}
        style={{ marginRight: 4 }}
      />
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      {label ? <Text style={[styles.barLabel, { color }]}>{label}</Text> : null}
    </View>
  );
}

export function HUD({ state, diamonds }: Props) {
  const weapon = WEAPONS[state.currentWeapon];
  const hpPct = state.playerHp / state.maxHp;

  return (
    <>
      {/* Top Left - HP & Stamina */}
      <View style={styles.topLeft}>
        <BarRow
          icon="heart"
          color={hpPct > 0.5 ? Colors.health : hpPct > 0.25 ? "#FF8C00" : "#FF3B30"}
          value={state.playerHp}
          max={state.maxHp}
        />
        <BarRow
          icon="lightning-bolt"
          color={state.staminaExhausted ? "#FF6B35" : Colors.stamina}
          value={state.stamina}
          max={100}
        />
      </View>

      {/* Top Center - Wave & Level */}
      <View style={styles.topCenter}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>LVL {state.level}</Text>
        </View>
        <Text style={styles.waveText}>
          WAVE {state.wave}/{3}
        </Text>
        <Text style={styles.killsText}>
          <MaterialCommunityIcons name="skull" size={11} color={Colors.textSecondary} /> {state.kills}
        </Text>
      </View>

      {/* Top Right - Diamonds */}
      <View style={styles.topRight}>
        <View style={styles.diamondRow}>
          <MaterialCommunityIcons name="diamond" size={16} color={Colors.diamond} />
          <Text style={styles.diamondText}>{diamonds}</Text>
        </View>
        <Text style={styles.scoreText}>{state.score}</Text>
      </View>

      {/* Bottom Center - Weapon Info */}
      <View style={styles.bottomCenter}>
        <View style={[
          styles.weaponBadge,
          state.isReloading && styles.weaponBadgeReloading
        ]}>
          <Text style={styles.weaponName}>{weapon.name.toUpperCase()}</Text>
          {state.isReloading ? (
            <View style={styles.reloadBar}>
              <View
                style={[
                  styles.reloadFill,
                  { width: `${state.reloadProgress * 100}%` },
                ]}
              />
              <Text style={styles.reloadText}>RELOADING</Text>
            </View>
          ) : (
            <Text style={styles.ammoText}>
              {state.ammo} / {state.maxAmmo}
            </Text>
          )}
        </View>
        {state.staminaExhausted && (
          <View style={styles.exhaustedBadge}>
            <Text style={styles.exhaustedText}>EXHAUSTED — RECOVERING</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    top: 0,
    left: 12,
    gap: 6,
    minWidth: 130,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
    minWidth: 24,
    textAlign: "right",
  },

  topCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 2,
  },
  levelBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  levelText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  waveText: {
    color: Colors.text,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
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
    gap: 2,
  },
  diamondRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,212,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.3)",
  },
  diamondText: {
    color: Colors.diamond,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  scoreText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },

  bottomCenter: {
    position: "absolute",
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 6,
  },
  weaponBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 140,
  },
  weaponBadgeReloading: {
    borderColor: Colors.ammo,
  },
  weaponName: {
    color: Colors.text,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  ammoText: {
    color: Colors.ammo,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  reloadBar: {
    width: 110,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  reloadFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: Colors.ammo,
    borderRadius: 3,
  },
  reloadText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: Colors.ammo,
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    top: -1,
  },

  exhaustedBadge: {
    backgroundColor: "rgba(255,107,53,0.2)",
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exhaustedText: {
    color: "#FF6B35",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
