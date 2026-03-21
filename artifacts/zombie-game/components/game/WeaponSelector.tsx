import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { WeaponId, WEAPONS } from "@/context/GameContext";

const WEAPON_ICONS: Record<WeaponId, string> = {
  pistol: "pistol",
  shotgun: "dots-horizontal-circle",
  sniper: "crosshairs-gps",
  uzi: "ray-start-arrow",
  minigun: "rotate-right",
  bazooka: "rocket-launch",
};

const WEAPON_ORDER: WeaponId[] = ["pistol", "shotgun", "sniper", "uzi", "minigun", "bazooka"];

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
              <MaterialCommunityIcons
                name={WEAPON_ICONS[wid] as any}
                size={20}
                color={!unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary}
              />
              <Text style={[styles.weaponLabel, {
                color: !unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary,
              }]}>
                {w.name}
              </Text>
              {selected && <View style={[styles.selectedDot, { backgroundColor: color }]} />}
              {!unlocked && (
                <MaterialCommunityIcons name="lock" size={10} color={Colors.textMuted} style={styles.lockIcon} />
              )}
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
    gap: 3,
    position: "relative",
  },
  locked: { opacity: 0.35 },
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
  lockIcon: { position: "absolute", top: 4, right: 4 },
});
