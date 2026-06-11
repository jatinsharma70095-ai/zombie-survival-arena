import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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

const TOTAL = WEAPON_ORDER.length; // 9
const PAGE = 5;                    // visible at once

interface Props {
  unlockedWeapons: WeaponId[];
  selectedWeapon: WeaponId;
  onSelect: (id: WeaponId) => void;
}

export function WeaponSelector({ unlockedWeapons, selectedWeapon, onSelect }: Props) {
  const [start, setStart] = useState(0);

  // Track previous selectedWeapon so we only auto-scroll when the game engine
  // changes the selection (e.g. auto-equip on unlock), NOT on every render.
  const prevWeapon = useRef(selectedWeapon);
  useEffect(() => {
    if (prevWeapon.current === selectedWeapon) return;
    prevWeapon.current = selectedWeapon;
    const idx = WEAPON_ORDER.indexOf(selectedWeapon);
    if (idx < 0) return;
    setStart(prev => {
      if (idx < prev) return idx;
      if (idx >= prev + PAGE) return idx - PAGE + 1;
      return prev;
    });
  }, [selectedWeapon]);

  const canLeft  = start > 0;
  const canRight = start + PAGE < TOTAL;
  const visible  = WEAPON_ORDER.slice(start, start + PAGE);

  const goLeft  = useCallback(() => setStart(p => Math.max(0, p - 1)), []);
  const goRight = useCallback(() => setStart(p => Math.min(TOTAL - PAGE, p + 1)), []);

  return (
    <View style={styles.container}>
      {/* ← arrow */}
      <Pressable
        style={[styles.arrow, !canLeft && styles.arrowDim]}
        onPress={goLeft}
        disabled={!canLeft}
        hitSlop={16}
      >
        <Text style={styles.arrowTxt}>{"<"}</Text>
      </Pressable>

      {/* Weapon slots */}
      <View style={styles.row}>
        {visible.map((wid) => {
          const w       = WEAPONS[wid];
          const unlocked = unlockedWeapons.includes(wid);
          const selected = selectedWeapon === wid;
          const color    = (Colors.weapons as Record<string, string>)[wid] ?? "#FFD60A";
          return (
            <Pressable
              key={wid}
              style={[
                styles.slot,
                selected && { borderColor: color, backgroundColor: `${color}22` },
                !unlocked && styles.slotLocked,
              ]}
              onPress={() => unlocked && onSelect(wid)}
              disabled={!unlocked}
            >
              <Text style={[styles.emoji, !unlocked && { opacity: 0.35 }]}>
                {WEAPON_EMOJI[wid]}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: !unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {w.name}
              </Text>
              {selected && <View style={[styles.dot, { backgroundColor: color }]} />}
              {!unlocked && <Text style={styles.lock}>🔒</Text>}
            </Pressable>
          );
        })}
      </View>

      {/* → arrow */}
      <Pressable
        style={[styles.arrow, !canRight && styles.arrowDim]}
        onPress={goRight}
        disabled={!canRight}
        hitSlop={16}
      >
        <Text style={styles.arrowTxt}>{">"}</Text>
      </Pressable>

      {/* Position dots */}
      <View style={styles.dots}>
        {WEAPON_ORDER.map((wid, i) => (
          <View
            key={wid}
            style={[
              styles.pip,
              i >= start && i < start + PAGE && styles.pipActive,
              selectedWeapon === wid && styles.pipSelected,
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
    bottom: 148,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 3,
  },
  arrow: {
    width: 34,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  arrowDim: { opacity: 0.18 },
  arrowTxt: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 26,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
    flex: 1,
    maxWidth: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    position: "relative",
  },
  slotLocked: { opacity: 0.38 },
  emoji: { fontSize: 22, lineHeight: 26 },
  label: {
    fontSize: 7,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  dot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  lock: { position: "absolute", top: 2, right: 2, fontSize: 9 },
  dots: {
    position: "absolute",
    bottom: -12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  pip: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  pipActive:   { backgroundColor: "rgba(255,255,255,0.35)" },
  pipSelected: { backgroundColor: "#FFD60A", width: 7, height: 7, borderRadius: 3.5, marginTop: -1 },
});
