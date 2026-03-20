import React, { useRef, useState } from "react";
import { PanResponder, View, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface Props {
  onShootAt: (dx: number, dy: number) => void;
  onReload: () => void;
}

export function ShootButton({ onShootAt, onReload }: Props) {
  const [active, setActive] = useState(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFireRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDirRef = useRef({ dx: 0, dy: -1 });

  const fireAt = (pageX: number, pageY: number, originX: number, originY: number) => {
    const dx = pageX - originX;
    const dy = pageY - originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      lastDirRef.current = { dx: dx / dist, dy: dy / dist };
    }
    onShootAt(lastDirRef.current.dx * 200, lastDirRef.current.dy * 200);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setActive(true);
        originRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        const px = evt.nativeEvent.pageX;
        const py = evt.nativeEvent.pageY;
        onShootAt(lastDirRef.current.dx * 200, lastDirRef.current.dy * 200);
        autoFireRef.current = setInterval(() => {
          if (originRef.current) {
            onShootAt(lastDirRef.current.dx * 200, lastDirRef.current.dy * 200);
          }
        }, 80);
      },
      onPanResponderMove: (evt) => {
        if (!originRef.current) return;
        fireAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY, originRef.current.x, originRef.current.y);
      },
      onPanResponderRelease: () => {
        setActive(false);
        if (autoFireRef.current) { clearInterval(autoFireRef.current); autoFireRef.current = null; }
        originRef.current = null;
      },
      onPanResponderTerminate: () => {
        setActive(false);
        if (autoFireRef.current) { clearInterval(autoFireRef.current); autoFireRef.current = null; }
        originRef.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.btn, active && styles.btnActive]}
        {...panResponder.panHandlers}
      >
        <MaterialCommunityIcons
          name="crosshairs"
          size={32}
          color={active ? Colors.accent : "rgba(255,255,255,0.7)"}
        />
      </View>
      <View style={styles.reloadBtn}>
        <MaterialCommunityIcons
          name="reload"
          size={20}
          color="rgba(255,255,255,0.6)"
          onPress={onReload}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 12,
  },
  btn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,59,48,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,59,48,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: "rgba(255,59,48,0.4)",
    borderColor: "#FF3B30",
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
