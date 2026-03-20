import React, { useRef, useState } from "react";
import { PanResponder, View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  onShootAt: () => void;
  onReload: () => void;
}

export function ShootButton({ onShootAt, onReload }: Props) {
  const [active, setActive] = useState(false);
  const autoFireRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActive(true);
        onShootAt();
        autoFireRef.current = setInterval(() => {
          onShootAt();
        }, 60);
      },
      onPanResponderRelease: () => {
        setActive(false);
        if (autoFireRef.current) { clearInterval(autoFireRef.current); autoFireRef.current = null; }
      },
      onPanResponderTerminate: () => {
        setActive(false);
        if (autoFireRef.current) { clearInterval(autoFireRef.current); autoFireRef.current = null; }
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <View style={styles.reloadBtn}>
        <MaterialCommunityIcons
          name="reload"
          size={20}
          color="rgba(255,255,255,0.6)"
          onPress={onReload}
        />
      </View>
      <View
        style={[styles.btn, active && styles.btnActive]}
        {...panResponder.panHandlers}
      >
        <MaterialCommunityIcons
          name="crosshairs"
          size={34}
          color={active ? "#FF3B30" : "rgba(255,255,255,0.8)"}
        />
        {active && (
          <View style={styles.aimRing} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  btn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,59,48,0.15)",
    borderWidth: 2.5,
    borderColor: "rgba(255,59,48,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: "rgba(255,59,48,0.35)",
    borderColor: "#FF3B30",
  },
  aimRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: "rgba(255,59,48,0.35)",
    borderStyle: "dashed",
  },
  reloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
