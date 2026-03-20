import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { WeaponId, WEAPONS } from "@/context/GameContext";

const WEAPON_ICONS: Record<WeaponId, string> = {
  pistol: "pistol",
  shotgun: "bullet",
  sniper: "crosshairs-gps",
  uzi: "gun",
  minigun: "shimmer",
  bazooka: "rocket-launch",
};

interface Props {
  unlockedWeapons: WeaponId[];
  selectedWeapon: WeaponId;
  onSelect: (id: WeaponId) => void;
}

export function WeaponSelector({ unlockedWeapons, selectedWeapon, onSelect }: Props) {
  const weaponOrder: WeaponId[] = ["pistol", "shotgun", "sniper", "uzi", "minigun", "bazooka"];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {weaponOrder.map((wid) => {
          const w = WEAPONS[wid];
          const unlocked = unlockedWeapons.includes(wid);
          const selected = selectedWeapon === wid;
          const color = (Colors.weapons as Record<string, string>)[wid];
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
                size={22}
                color={!unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.weaponLabel,
                  { color: !unlocked ? Colors.textMuted : selected ? color : Colors.textSecondary },
                ]}
              >
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
    bottom: 155,
    left: 0,
    right: 0,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  weaponBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 62,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 3,
    position: "relative",
  },
  locked: {
    opacity: 0.4,
  },
  weaponLabel: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  selectedDot: {
    position: "absolute",
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  lockIcon: {
    position: "absolute",
    top: 4,
    right: 4,
  },
});
