import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Rect,
  Line,
  G,
  Polygon,
  Defs,
  RadialGradient,
  Stop,
  Path,
} from "react-native-svg";
import { GameState } from "./GameEngine";
import Colors from "@/constants/colors";

interface Props {
  state: GameState;
}

function getWeaponColor(weaponId: string): string {
  return (Colors.weapons as Record<string, string>)[weaponId] ?? "#FFD60A";
}

function ZombieShape({ z }: { z: GameState["zombies"][0] }) {
  if (z.isDead) {
    return (
      <G key={z.id}>
        <Circle cx={z.x} cy={z.y} r={10} fill="rgba(139,0,0,0.4)" />
        <Circle cx={z.x - 3} cy={z.y} r={3} fill="rgba(180,0,0,0.3)" />
        <Circle cx={z.x + 3} cy={z.y} r={3} fill="rgba(180,0,0,0.3)" />
      </G>
    );
  }
  const hpPct = z.hp / z.maxHp;
  const bodyColor = `rgb(${Math.floor(80 + (1 - hpPct) * 80)}, ${Math.floor(140 * hpPct)}, ${Math.floor(40 * hpPct)})`;
  return (
    <G key={z.id}>
      {/* Shadow */}
      <Circle cx={z.x + 2} cy={z.y + 2} r={14} fill="rgba(0,0,0,0.3)" />
      {/* Body */}
      <Circle cx={z.x} cy={z.y} r={14} fill={bodyColor} />
      {/* Eyes */}
      <Circle cx={z.x - 4} cy={z.y - 3} r={3} fill="#FF0000" />
      <Circle cx={z.x + 4} cy={z.y - 3} r={3} fill="#FF0000" />
      <Circle cx={z.x - 4} cy={z.y - 3} r={1.2} fill="#FF4444" />
      <Circle cx={z.x + 4} cy={z.y - 3} r={1.2} fill="#FF4444" />
      {/* Mouth */}
      <Path
        d={`M ${z.x - 4} ${z.y + 3} Q ${z.x} ${z.y + 7} ${z.x + 4} ${z.y + 3}`}
        stroke="#8B0000"
        strokeWidth={1.5}
        fill="none"
      />
      {/* HP bar */}
      <Rect x={z.x - 12} y={z.y - 22} width={24} height={3} fill="#333" rx={1.5} />
      <Rect x={z.x - 12} y={z.y - 22} width={24 * hpPct} height={3} fill={hpPct > 0.5 ? "#4CD964" : hpPct > 0.25 ? "#FFD60A" : "#FF3B30"} rx={1.5} />
    </G>
  );
}

function PlayerShape({ player, angle }: { player: { x: number; y: number; angle: number }; angle: number }) {
  const gunEndX = player.x + Math.cos(angle) * 22;
  const gunEndY = player.y + Math.sin(angle) * 22;
  return (
    <G>
      {/* Shadow */}
      <Circle cx={player.x + 2} cy={player.y + 2} r={17} fill="rgba(0,0,0,0.4)" />
      {/* Body */}
      <Circle cx={player.x} cy={player.y} r={16} fill="#2C5282" />
      <Circle cx={player.x} cy={player.y} r={13} fill="#3182CE" />
      {/* Gun barrel */}
      <Line
        x1={player.x}
        y1={player.y}
        x2={gunEndX}
        y2={gunEndY}
        stroke="#718096"
        strokeWidth={5}
        strokeLinecap="round"
      />
      {/* Face dot */}
      <Circle cx={player.x + Math.cos(angle) * 7} cy={player.y + Math.sin(angle) * 7} r={3} fill="#63B3ED" />
    </G>
  );
}

export function GameCanvas({ state }: Props) {
  const groundPattern = useMemo(() => {
    const tiles = [];
    const tileSize = 80;
    for (let row = 0; row < Math.ceil(800 / tileSize) + 1; row++) {
      for (let col = 0; col < Math.ceil(400 / tileSize) + 1; col++) {
        tiles.push(
          <Rect
            key={`tile-${row}-${col}`}
            x={col * tileSize}
            y={row * tileSize}
            width={tileSize}
            height={tileSize}
            fill={((row + col) % 2 === 0) ? "#0D1117" : "#0F1620"}
            stroke="#151B24"
            strokeWidth={0.5}
          />
        );
      }
    }
    return tiles;
  }, []);

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="explosionGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.9" />
            <Stop offset="50%" stopColor="#FF3B30" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Ground */}
        {groundPattern}

        {/* Explosions */}
        {state.explosions.map((e) => (
          <Circle
            key={e.id}
            cx={e.x}
            cy={e.y}
            r={e.radius}
            fill="url(#explosionGrad)"
            opacity={0.8}
          />
        ))}

        {/* Bullets */}
        {state.bullets.map((b) => (
          <G key={b.id}>
            {b.isExplosive ? (
              <>
                <Circle cx={b.x} cy={b.y} r={7} fill="#FF6B35" opacity={0.7} />
                <Circle cx={b.x} cy={b.y} r={4} fill="#FFD700" />
              </>
            ) : (
              <>
                <Circle cx={b.x} cy={b.y} r={4} fill={getWeaponColor(b.weaponId)} opacity={0.5} />
                <Circle cx={b.x} cy={b.y} r={2.5} fill={getWeaponColor(b.weaponId)} />
              </>
            )}
          </G>
        ))}

        {/* Zombies */}
        {state.zombies.map((z) => <ZombieShape key={z.id} z={z} />)}

        {/* Player */}
        <PlayerShape player={state.player} angle={state.player.angle} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
