import React, { useCallback, useRef, useState } from "react";
import {
  PanResponder,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import Colors from "@/constants/colors";

interface Props {
  onMove: (dx: number, dy: number, sprinting: boolean) => void;
  onSprintChange?: (sprinting: boolean) => void;
  side: "left" | "right";
  size?: number;
}

const MAX_DIST = 40;

export function Joystick({ onMove, side, size = 100 }: Props) {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pressStartRef = useRef<number>(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setActive(true);
        pressStartRef.current = Date.now();
        originRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
      },
      onPanResponderMove: (evt) => {
        if (!originRef.current) return;
        const dx = evt.nativeEvent.pageX - originRef.current.x;
        const dy = evt.nativeEvent.pageY - originRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, MAX_DIST);
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * clamped;
        const ky = Math.sin(angle) * clamped;
        setKnobPos({ x: kx, y: ky });
        const nx = dist > 5 ? Math.cos(angle) : 0;
        const ny = dist > 5 ? Math.sin(angle) : 0;
        const sprinting = Date.now() - pressStartRef.current > 200 && dist > MAX_DIST * 0.8;
        onMove(nx, ny, sprinting);
      },
      onPanResponderRelease: () => {
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        originRef.current = null;
        onMove(0, 0, false);
      },
      onPanResponderTerminate: () => {
        setActive(false);
        setKnobPos({ x: 0, y: 0 });
        originRef.current = null;
        onMove(0, 0, false);
      },
    })
  ).current;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.containerActive,
      ]}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.knob,
          {
            transform: [{ translateX: knobPos.x }, { translateY: knobPos.y }],
            opacity: active ? 1 : 0.6,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  containerActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  knob: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.7)",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
});
