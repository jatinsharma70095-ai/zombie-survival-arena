import React, { useRef, useState } from "react";
import { PanResponder, View, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props { onShootAt: () => void; onReload: () => void; }

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
        autoFireRef.current = setInterval(() => onShootAt(), 60);
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
      {/* Reload button above */}
      <Pressable style={styles.reloadBtn} onPress={onReload}>
        <MaterialCommunityIcons name="reload" size={22} color="rgba(255,255,255,0.65)" />
      </Pressable>

      {/* Main shoot button */}
      <View
        style={[styles.btn, active && styles.btnActive]}
        {...panResponder.panHandlers}
      >
        <MaterialCommunityIcons
          name="crosshairs"
          size={36}
          color={active ? "#FF3B30" : "rgba(255,255,255,0.85)"}
        />
        {active && <View style={styles.aimRing} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 10,
  },
  reloadBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,59,48,0.14)",
    borderWidth: 2.5,
    borderColor: "rgba(255,59,48,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: "rgba(255,59,48,0.32)",
    borderColor: "#FF3B30",
  },
  aimRing: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1.5,
    borderColor: "rgba(255,59,48,0.3)",
    borderStyle: "dashed",
  },
});
