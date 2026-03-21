import { router } from "expo-router";
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameContext";

const PACKAGES = [
  { id: "p1", diamonds: 100, price: "$0.99", bonus: "", popular: false },
  { id: "p2", diamonds: 550, price: "$4.99", bonus: "+50 BONUS", popular: false },
  { id: "p3", diamonds: 1200, price: "$9.99", bonus: "+200 BONUS", popular: true },
  { id: "p4", diamonds: 2600, price: "$19.99", bonus: "+600 BONUS", popular: false },
  { id: "p5", diamonds: 7000, price: "$49.99", bonus: "+2000 BONUS", popular: false },
  { id: "p6", diamonds: 15000, price: "$99.99", bonus: "+5000 BONUS", popular: false },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { playerStats, addDiamonds } = useGame();
  const [successPkg, setSuccessPkg] = useState<typeof PACKAGES[0] | null>(null);
  const [adWatching, setAdWatching] = useState(false);
  const [adCooldown, setAdCooldown] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePurchase = (pkg: typeof PACKAGES[0]) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addDiamonds(pkg.diamonds);
    setSuccessPkg(pkg);
  };

  const handleWatchAd = () => {
    if (adCooldown) return;
    setAdWatching(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Simulate ad watching (5 second wait)
    setTimeout(() => {
      setAdWatching(false);
      addDiamonds(20);
      setAdCooldown(true);
      // Cooldown for 30 seconds
      setTimeout(() => setAdCooldown(false), 30000);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Ad Complete!", "You earned 20 free diamonds!", [{ text: "Thanks!" }]);
    }, 5000);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>DIAMOND SHOP</Text>
        <View style={styles.balanceBadge}>
          <MaterialCommunityIcons name="diamond" size={14} color={Colors.diamond} />
          <Text style={styles.balanceText}>{playerStats.diamonds}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <LinearGradient colors={["#001A33", "#00284D"]} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <MaterialCommunityIcons name="diamond-stone" size={40} color={Colors.diamond} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Get Diamonds</Text>
            <Text style={styles.bannerSub}>Use diamonds to unlock powerful weapons & keep surviving</Text>
          </View>
        </LinearGradient>

        {/* Notice */}
        <View style={styles.notice}>
          <MaterialCommunityIcons name="information-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.noticeText}>This is a demo shop. Purchases are simulated and free.</Text>
        </View>

        {/* FREE DIAMONDS SECTION */}
        <Text style={styles.sectionTitle}>FREE DIAMONDS</Text>

        {/* Watch Ad - OPTIONAL */}
        <Pressable
          style={[styles.adCard, adCooldown && styles.adCardDisabled]}
          onPress={handleWatchAd}
          disabled={adWatching || adCooldown}
        >
          <LinearGradient
            colors={adCooldown ? ["#1A1A1A", "#111"] : ["rgba(255,200,0,0.12)", "rgba(255,150,0,0.08)"]}
            style={styles.adGrad}
          >
            <View style={styles.adLeft}>
              <MaterialCommunityIcons
                name={adWatching ? "loading" : adCooldown ? "clock-outline" : "play-circle"}
                size={32}
                color={adCooldown ? Colors.textMuted : "#FFD60A"}
              />
              <View style={styles.adInfo}>
                <Text style={[styles.adTitle, adCooldown && { color: Colors.textMuted }]}>
                  {adWatching ? "Watching ad..." : adCooldown ? "Come back soon" : "Watch a Short Ad"}
                </Text>
                <Text style={[styles.adSub, adCooldown && { color: Colors.textMuted }]}>
                  {adWatching ? "Please wait 5 seconds" : adCooldown ? "Cooldown active — 30s" : "100% optional — never forced"}
                </Text>
              </View>
            </View>
            <View style={[styles.adReward, adCooldown && { borderColor: Colors.textMuted, backgroundColor: "transparent" }]}>
              <MaterialCommunityIcons name="diamond" size={13} color={adCooldown ? Colors.textMuted : Colors.diamond} />
              <Text style={[styles.adRewardText, adCooldown && { color: Colors.textMuted }]}>+20</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Daily Login Bonus */}
        <Pressable
          style={({ pressed }) => [styles.freeCard, pressed && { opacity: 0.8 }]}
          onPress={() => {
            addDiamonds(25);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Daily Reward!", "You got 25 free diamonds!", [{ text: "Nice!" }]);
          }}
        >
          <MaterialCommunityIcons name="gift" size={28} color={Colors.gold} />
          <View style={styles.freeInfo}>
            <Text style={styles.freeName}>Daily Login Bonus</Text>
            <Text style={styles.freeSub}>Free 25 diamonds every day</Text>
          </View>
          <View style={styles.freeReward}>
            <MaterialCommunityIcons name="diamond" size={14} color={Colors.diamond} />
            <Text style={styles.freeRewardText}>+25</Text>
          </View>
        </Pressable>

        {/* Diamond Packs */}
        <Text style={styles.sectionTitle}>DIAMOND PACKS</Text>
        <View style={styles.packGrid}>
          {PACKAGES.map((pkg) => (
            <Pressable
              key={pkg.id}
              style={({ pressed }) => [
                styles.packCard,
                pkg.popular && styles.packCardPopular,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => handlePurchase(pkg)}
            >
              {pkg.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>BEST VALUE</Text>
                </View>
              )}
              <MaterialCommunityIcons name="diamond" size={32} color={pkg.popular ? Colors.diamond : "#4A9EFF"} />
              <Text style={styles.packDiamonds}>{pkg.diamonds.toLocaleString()}</Text>
              {pkg.bonus ? (
                <View style={styles.bonusBadge}>
                  <Text style={styles.bonusText}>{pkg.bonus}</Text>
                </View>
              ) : null}
              <Pressable style={[styles.buyBtn, pkg.popular && styles.buyBtnPopular]} onPress={() => handlePurchase(pkg)}>
                <Text style={styles.buyText}>{pkg.price}</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={!!successPkg} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.successCard}>
            <MaterialCommunityIcons name="check-circle" size={56} color={Colors.green} />
            <Text style={styles.successTitle}>Purchase Successful!</Text>
            <View style={styles.successReward}>
              <MaterialCommunityIcons name="diamond" size={20} color={Colors.diamond} />
              <Text style={styles.successDiamonds}>+{successPkg?.diamonds.toLocaleString()} Diamonds</Text>
            </View>
            <Text style={styles.successBalance}>New balance: {playerStats.diamonds.toLocaleString()}</Text>
            <Pressable style={styles.successBtn} onPress={() => setSuccessPkg(null)}>
              <Text style={styles.successBtnText}>GREAT!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: Colors.text, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  balanceBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,212,255,0.1)", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,212,255,0.2)",
  },
  balanceText: { color: Colors.diamond, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  banner: {
    borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16,
    borderWidth: 1, borderColor: "rgba(0,212,255,0.2)",
  },
  bannerText: { flex: 1, gap: 4 },
  bannerTitle: { color: Colors.text, fontSize: 20, fontFamily: "Inter_700Bold" },
  bannerSub: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  notice: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  noticeText: { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  sectionTitle: {
    color: Colors.textSecondary, fontSize: 11,
    fontFamily: "Inter_700Bold", letterSpacing: 2, marginTop: 4,
  },

  // Ad card
  adCard: {
    borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,200,0,0.25)",
  },
  adCardDisabled: { borderColor: "rgba(255,255,255,0.08)" },
  adGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  adLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  adInfo: { flex: 1, gap: 3 },
  adTitle: { color: Colors.text, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  adSub: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" },
  adReward: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,212,255,0.1)", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, borderColor: "rgba(0,212,255,0.25)",
  },
  adRewardText: { color: Colors.diamond, fontSize: 14, fontFamily: "Inter_700Bold" },

  freeCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.card, borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)", borderRadius: 16, padding: 16, gap: 14,
  },
  freeInfo: { flex: 1, gap: 3 },
  freeName: { color: Colors.text, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  freeSub: { color: Colors.textSecondary, fontSize: 12, fontFamily: "Inter_400Regular" },
  freeReward: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,212,255,0.1)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  freeRewardText: { color: Colors.diamond, fontSize: 14, fontFamily: "Inter_700Bold" },

  packGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  packCard: {
    width: "47%", backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 18, padding: 16, alignItems: "center", gap: 8, position: "relative",
  },
  packCardPopular: { borderColor: Colors.diamond, backgroundColor: "rgba(0,212,255,0.05)" },
  popularBadge: {
    position: "absolute", top: -1, left: "50%",
    transform: [{ translateX: -40 }],
    backgroundColor: Colors.diamond,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
  },
  popularText: { color: "#000", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  packDiamonds: { color: Colors.text, fontSize: 22, fontFamily: "Inter_700Bold" },
  bonusBadge: {
    backgroundColor: "rgba(76,217,100,0.15)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(76,217,100,0.3)",
  },
  bonusText: { color: Colors.green, fontSize: 10, fontFamily: "Inter_700Bold" },
  buyBtn: {
    width: "100%", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginTop: 4,
  },
  buyBtnPopular: { backgroundColor: Colors.diamond, borderColor: Colors.diamond },
  buyText: { color: Colors.text, fontSize: 15, fontFamily: "Inter_700Bold" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  successCard: {
    width: "78%", backgroundColor: Colors.card, borderRadius: 24, padding: 32,
    alignItems: "center", gap: 14, borderWidth: 1, borderColor: Colors.border,
  },
  successTitle: { color: Colors.text, fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successReward: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(0,212,255,0.1)", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,212,255,0.2)",
  },
  successDiamonds: { color: Colors.diamond, fontSize: 20, fontFamily: "Inter_700Bold" },
  successBalance: { color: Colors.textSecondary, fontSize: 13, fontFamily: "Inter_400Regular" },
  successBtn: {
    width: "100%", backgroundColor: Colors.green, borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginTop: 4,
  },
  successBtnText: { color: Colors.text, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
});
