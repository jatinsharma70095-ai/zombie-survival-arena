import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import Colors from "@/constants/colors";
import { WeaponId, WEAPONS } from "@/context/GameContext";

const WEAPON_EMOJI: Record<WeaponId, string> = {
  pistol: "🔫",
  shotgun: "⊙",
  sniper: "🎯",
  uzi: "↯",
  minigun: "🌀",
  bazooka: "🚀",
  flamethrower: "🔥",
  grenadelauncher: "💣",
  lasergun: "⚡",
};

const WEAPON_ORDER: WeaponId[] = [
  "pistol", "shotgun", "sniper", "uzi", "minigun",
  "bazooka", "flamethrower", "grenadelauncher", "lasergun",
];

// How many weapon slots to show at once
const PAGE_SIZE = 5;

interface Props {
  unlockedWeapons: WeaponId[];
  selectedWeapon: WeaponId;
  onSelect: (id: WeaponId) => void;
}

export function WeaponSelector({ unlockedWeapons, selectedWeapon, onSelect }: Props) {
  // Start the window so the selected weapon is visible
  const selectedIdx = WEAPON_ORDER.indexOf(selectedWeapon);
  const [windowStart, setWindowStart] = useState(() =>
    Math.min(Math.max(0, selectedIdx - Math.floor(PAGE_SIZE / 2)), WEAPON_ORDER.length - PAGE_SIZE)
  );

  const canLeft = windowStart > 0;
  const canRight = windowStart + PAGE_SIZE < WEAPON_ORDER.length;
  const visible = WEAPON_ORDER.slice(windowStart, windowStart + PAGE_SIZE);

  const goLeft = useCallback(() => {
    setWindowStart(prev => Math.max(0, prev - 1));
  }, []);

  const goRight = useCallback(() => {
    setWindowStart(prev => Math.min(WEAPON_ORDER.length - PAGE_SIZE, prev + 1));
  }, []);

  // Scroll window to keep selected weapon visible when it changes externally
  const selIdx = WEAPON_ORDER.indexOf(selectedWeapon);
  if (selIdx < windowStart) setWindowStart(selIdx);
  else if (selIdx >= windowStart + PAGE_SIZE) setWindowStart(selIdx - PAGE_SIZE + 1);

  return (
    <View style={styles.container}>
      {/* Left arrow */}
      <Pressable
        style={[styles.arrow, !canLeft && styles.arrowDisabled]}
        onPress={goLeft}
        disabled={!canLeft}
        hitSlop={12}
      >
        <Text style={[styles.arrowText, !canLeft && styles.arrowTextDisabled]}>‹</Text>
      </Pressable>

      {/* Weapon slots */}
      <View style={styles.slotsRow}>
        {visible.map((wid) => {
          const w = WEAPONS[wid];
          const unlocked = unlockedWeapons.includes(wid);
          const selected = selectedWeapon === wid;
          const color = (Colors.weapons as Record<string, string>)[wid] ?? "#FFD60A";
          return (
            <Pressable
              key={wid}
              style={[
                styles.weaponBtn,
                selected && { borderColor: color, backgroundColor: `${color}22` },
                !unlocked && styles.locked,
              ]}
              onPress={() => unlocked && onSelect(wid)}
              disabled={!unlocked}
            >
              <Text style={[styles.weaponEmoji, { opacity: !unlocked ? 0.4 : 1 }]}>
                {WEAPON_EMOJI[wid]}
              </Text>
              <Text
                style={[
                  styles.weaponLabel,
                  { color: !unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {w.name}
              </Text>
              {selected && <View style={[styles.selectedDot, { backgroundColor: color }]} />}
              {!unlocked && <Text style={styles.lockIcon}>🔒</Text>}
            </Pressable>
          );
        })}
      </View>

      {/* Right arrow */}
      <Pressable
        style={[styles.arrow, !canRight && styles.arrowDisabled]}
        onPress={goRight}
        disabled={!canRight}
        hitSlop={12}
      >
        <Text style={[styles.arrowText, !canRight && styles.arrowTextDisabled]}>›</Text>
      </Pressable>

      {/* Dot indicator — shows position in the full list */}
      <View style={styles.dotsRow}>
        {WEAPON_ORDER.map((wid, i) => (
          <View
            key={wid}
            style={[
              styles.dot,
              i >= windowStart && i < windowStart + PAGE_SIZE && styles.dotVisible,
              selectedWeapon === wid && styles.dotSelected,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 152,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 4,
  },
  arrow: {
    width: 28,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  arrowDisabled: {
    opacity: 0.2,
  },
  arrowText: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
  },
  arrowTextDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  slotsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  weaponBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 62,
    height: 60,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 2,
    position: "relative",
  },
  locked: { opacity: 0.35 },
  weaponEmoji: { fontSize: 22, lineHeight: 26 },
  weaponLabel: {
    fontSize: 7,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  selectedDot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  lockIcon: { position: "absolute", top: 2, right: 2, fontSize: 9 },
  dotsRow: {
    position: "absolute",
    bottom: -10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dotVisible: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotSelected: {
    backgroundColor: "#FFD60A",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -1,
  },
});
