import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
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

interface Props {
  unlockedWeapons: WeaponId[];
  selectedWeapon: WeaponId;
  onSelect: (id: WeaponId) => void;
}

export function WeaponSelector({ unlockedWeapons, selectedWeapon, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        scrollEnabled={true}
      >
        {WEAPON_ORDER.map((wid) => {
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
              <Text style={[styles.weaponLabel, {
                color: !unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary,
              }]}>
                {w.name}
              </Text>
              {selected && <View style={[styles.selectedDot, { backgroundColor: color }]} />}
              {!unlocked && <Text style={styles.lockIcon}>🔒</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 152,
    left: 0,
    right: 0,
  },
  scroll: {
    paddingHorizontal: 14,
    gap: 7,
    alignItems: "center",
  },
  weaponBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 58,
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
    fontSize: 7.5,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  selectedDot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  lockIcon: { position: "absolute", top: 2, right: 2, fontSize: 9 },
});
