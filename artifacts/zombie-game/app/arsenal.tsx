import { router } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGame, WEAPONS, WeaponId } from "@/context/GameContext";

const WEAPON_ICONS: Record<WeaponId, string> = {
  pistol: "pistol",
  shotgun: "bullet",
  sniper: "crosshairs-gps",
  uzi: "pistol",
  minigun: "shimmer",
  bazooka: "rocket-launch",
};

const WEAPON_ORDER: WeaponId[] = ["pistol", "shotgun", "sniper", "uzi", "minigun", "bazooka"];

export default function ArsenalScreen() {
  const insets = useSafeAreaInsets();
  const { playerStats, unlockWeapon, selectWeapon } = useGame();
  const [selected, setSelected] = useState<WeaponId | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleUnlock = (weaponId: WeaponId) => {
    const weapon = WEAPONS[weaponId];
    if (playerStats.diamonds < weapon.unlockCost) {
      Alert.alert(
        "Not Enough Diamonds",
        `You need ${weapon.unlockCost} diamonds. Go to the shop to get more!`,
        [
          { text: "Shop", onPress: () => router.push("/shop") },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ok = unlockWeapon(weaponId);
    if (ok) setSelected(null);
  };

  const handleSelect = (weaponId: WeaponId) => {
    if (!playerStats.unlockedWeapons.includes(weaponId)) {
      setSelected(weaponId);
      return;
    }
    selectWeapon(weaponId);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>ARSENAL</Text>
        <View style={styles.diamondBadge}>
          <MaterialCommunityIcons name="diamond" size={14} color={Colors.diamond} />
          <Text style={styles.diamondText}>{playerStats.diamonds}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Select your weapon before entering a level. Unlock new weapons with diamonds.
        </Text>

        {WEAPON_ORDER.map((wid) => {
          const w = WEAPONS[wid];
          const unlocked = playerStats.unlockedWeapons.includes(wid);
          const active = playerStats.selectedWeapon === wid;
          const color = (Colors.weapons as Record<string, string>)[wid];

          return (
            <Pressable
              key={wid}
              style={({ pressed }) => [
                styles.weaponCard,
                active && { borderColor: color, backgroundColor: `${color}11` },
                !unlocked && styles.weaponCardLocked,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => handleSelect(wid)}
            >
              {/* Icon */}
              <View
                style={[
                  styles.weaponIcon,
                  { backgroundColor: `${color}22` },
                  active && { backgroundColor: `${color}44` },
                ]}
              >
                <MaterialCommunityIcons
                  name={WEAPON_ICONS[wid] as any}
                  size={28}
                  color={unlocked ? color : Colors.textMuted}
                />
                {!unlocked && (
                  <View style={styles.lockOverlay}>
                    <MaterialCommunityIcons name="lock" size={14} color={Colors.textMuted} />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.weaponInfo}>
                <View style={styles.weaponTitleRow}>
                  <Text style={[styles.weaponName, !unlocked && { color: Colors.textMuted }]}>
                    {w.name}
                  </Text>
                  {active && (
                    <View style={[styles.activeBadge, { backgroundColor: color }]}>
                      <Text style={styles.activeText}>EQUIPPED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.weaponDesc}>{w.description}</Text>

                {/* Stats */}
                <View style={styles.statBars}>
                  <StatBar label="DMG" value={w.damage / 200} color={Colors.health} />
                  <StatBar label="SPD" value={1 - w.fireRate / 3000} color={Colors.gold} />
                  <StatBar label="RNG" value={w.range / 400} color={color} />
                </View>
              </View>

              {/* Right */}
              <View style={styles.weaponRight}>
                {!unlocked ? (
                  <View style={styles.costBadge}>
                    <MaterialCommunityIcons name="diamond" size={12} color={Colors.diamond} />
                    <Text style={styles.costText}>{w.unlockCost}</Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name={active ? "check-circle" : "circle-outline"}
                    size={24}
                    color={active ? color : Colors.textMuted}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Unlock modal */}
      <Modal visible={!!selected} transparent animationType="fade">
        {selected && (
          <View style={styles.overlay}>
            <View style={styles.unlockCard}>
              <MaterialCommunityIcons
                name={WEAPON_ICONS[selected] as any}
                size={52}
                color={(Colors.weapons as Record<string, string>)[selected]}
              />
              <Text style={styles.unlockTitle}>{WEAPONS[selected].name}</Text>
              <Text style={styles.unlockDesc}>{WEAPONS[selected].description}</Text>
              <View style={styles.unlockCostRow}>
                <MaterialCommunityIcons name="diamond" size={18} color={Colors.diamond} />
                <Text style={styles.unlockCostText}>{WEAPONS[selected].unlockCost}</Text>
                <Text style={styles.unlockCostSub}>
                  / {playerStats.diamonds} available
                </Text>
              </View>
              <Pressable
                style={[
                  styles.unlockBtn,
                  playerStats.diamonds < WEAPONS[selected].unlockCost && { opacity: 0.5 },
                ]}
                onPress={() => handleUnlock(selected)}
              >
                <LinearGradient
                  colors={["#0A5C2B", "#0D7A39"]}
                  style={styles.unlockBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.unlockBtnText}>UNLOCK</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={statStyles.row}>
      <Text style={statStyles.label}>{label}</Text>
      <View style={statStyles.track}>
        <View
          style={[
            statStyles.fill,
            { width: `${Math.max(5, Math.min(100, value * 100))}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    width: 24,
    letterSpacing: 0.5,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
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
  diamondText: { color: Colors.diamond, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  weaponCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  weaponCardLocked: { opacity: 0.65 },
  weaponIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  lockOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 2,
  },
  weaponInfo: { flex: 1, gap: 4 },
  weaponTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  weaponName: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  activeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeText: { color: "#000", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  weaponDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statBars: { gap: 3, marginTop: 4 },
  weaponRight: { alignItems: "center", justifyContent: "center", minWidth: 50 },
  costBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,212,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  costText: { color: Colors.diamond, fontSize: 13, fontFamily: "Inter_700Bold" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  unlockCard: {
    width: "82%",
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unlockTitle: {
    color: Colors.text,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  unlockDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  unlockCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,212,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.15)",
  },
  unlockCostText: { color: Colors.diamond, fontSize: 22, fontFamily: "Inter_700Bold" },
  unlockCostSub: { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  unlockBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  unlockBtnGrad: {
    paddingVertical: 16,
    alignItems: "center",
  },
  unlockBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
