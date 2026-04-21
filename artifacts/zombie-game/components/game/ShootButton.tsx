import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";

interface Props { onShootAt: () => void; onReload: () => void; }

export function ShootButton({ onShootAt, onReload }: Props) {
  const [active, setActive] = useState(false);
  const autoFireRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const btnRef = useRef<View>(null);

  const startFire = () => {
    setActive(true);
    onShootAt();
    if (autoFireRef.current) clearInterval(autoFireRef.current);
    autoFireRef.current = setInterval(() => onShootAt(), 60);
  };

  const stopFire = () => {
    setActive(false);
    if (autoFireRef.current) { clearInterval(autoFireRef.current); autoFireRef.current = null; }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = (btnRef.current as any)?._nativeTag
      ? document.getElementById("shoot-btn-web")
      : document.getElementById("shoot-btn-web");
    return () => { stopFire(); };
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrapper}>
        {/* Reload */}
        <Pressable
          style={styles.reloadBtn}
          onPress={(e) => { (e as any).preventDefault?.(); onReload(); }}
        >
          <Text style={styles.reloadIcon}>↺</Text>
        </Pressable>

        {/* Shoot — web uses div with touch/pointer events */}
        <View
          style={[styles.btn, active && styles.btnActive]}
          // @ts-ignore
          onPointerDown={(e: any) => { e.preventDefault(); startFire(); }}
          onPointerUp={(e: any) => { e.preventDefault(); stopFire(); }}
          onPointerLeave={(e: any) => { e.preventDefault(); stopFire(); }}
          onPointerCancel={(e: any) => { e.preventDefault(); stopFire(); }}
          onTouchStart={(e: any) => { e.preventDefault(); startFire(); }}
          onTouchEnd={(e: any) => { e.preventDefault(); stopFire(); }}
          onTouchCancel={(e: any) => { e.preventDefault(); stopFire(); }}
        >
          <Text style={[styles.crosshair, active && styles.crosshairActive]}>⊕</Text>
          {active && <View style={styles.aimRing} />}
        </View>
      </View>
    );
  }

  // Native: use state-based PanResponder equivalent via onPressIn/Out
  const { PanResponder } = require("react-native");
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startFire(); },
      onPanResponderRelease: () => { stopFire(); },
      onPanResponderTerminate: () => { stopFire(); },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.reloadBtn} onPress={onReload}>
        <Text style={styles.reloadIcon}>↺</Text>
      </Pressable>
      <View style={[styles.btn, active && styles.btnActive]} {...panResponder.panHandlers}>
        <Text style={[styles.crosshair, active && styles.crosshairActive]}>⊕</Text>
        {active && <View style={styles.aimRing} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 10,
    // @ts-ignore
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "none",
  } as any,
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
  reloadIcon: {
    fontSize: 24,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 28,
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
    // @ts-ignore
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    cursor: "pointer",
  } as any,
  btnActive: {
    backgroundColor: "rgba(255,59,48,0.32)",
    borderColor: "#FF3B30",
  },
  crosshair: {
    fontSize: 38,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 42,
    // @ts-ignore
    userSelect: "none",
  } as any,
  crosshairActive: {
    color: "#FF3B30",
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
