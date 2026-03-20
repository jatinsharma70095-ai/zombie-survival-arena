import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, {
  Circle,
  Rect,
  Ellipse,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Path,
  Polygon,
  Line,
} from "react-native-svg";
import { GameState } from "./GameEngine";
import Colors from "@/constants/colors";

const { width: SW, height: SH } = Dimensions.get("window");

interface Props {
  state: GameState;
}

function getWeaponColor(weaponId: string): string {
  return (Colors.weapons as Record<string, string>)[weaponId] ?? "#FFD60A";
}

// ─── Anime Player Bot ───────────────────────────────────────────────────────
function PlayerBot({ x, y, angle }: { x: number; y: number; angle: number }) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Weapon tip direction
  const wTipX = x + cos * 20;
  const wTipY = y + sin * 20;
  const wBaseX = x + cos * 8;
  const wBaseY = y + sin * 8;

  return (
    <G>
      {/* Ground shadow */}
      <Ellipse cx={x + 1} cy={y + 14} rx={13} ry={5} fill="rgba(0,0,0,0.3)" />

      {/* ── LEGS ── */}
      <Rect x={x - 8} y={y + 8} width={6} height={10} rx={3} fill="#1A3A5C" />
      <Rect x={x + 2} y={y + 8} width={6} height={10} rx={3} fill="#1A3A5C" />
      {/* Feet */}
      <Rect x={x - 10} y={y + 16} width={8} height={4} rx={2} fill="#0F2840" />
      <Rect x={x + 2} y={y + 16} width={8} height={4} rx={2} fill="#0F2840" />

      {/* ── BODY / TORSO ── */}
      <Rect x={x - 10} y={y - 4} width={20} height={14} rx={4} fill="#1E4D8C" />
      {/* Chest detail stripe */}
      <Rect x={x - 6} y={y - 1} width={12} height={3} rx={1.5} fill="#2A70D6" opacity={0.7} />
      {/* Core glow */}
      <Circle cx={x} cy={y + 4} r={3} fill="#00D4FF" opacity={0.8} />
      <Circle cx={x} cy={y + 4} r={1.5} fill="#FFFFFF" />

      {/* ── ARMS ── */}
      {/* Left arm (passive) */}
      <Rect x={x - 15} y={y - 2} width={6} height={9} rx={3} fill="#1A3A5C" />
      {/* Right arm (weapon side) — rotates toward aim angle */}
      <G origin={`${x}, ${y}`} rotation={(angle * 180) / Math.PI} originX={x} originY={y}>
        <Rect x={x + 9} y={y - 3} width={6} height={9} rx={3} fill="#1A3A5C" />
        {/* Weapon barrel */}
        <Rect x={x + 12} y={y - 2} width={14} height={4} rx={2} fill="#2D2D2D" />
        <Rect x={x + 22} y={y - 1} width={6} height={2} rx={1} fill="#555" />
      </G>

      {/* ── HEAD ── */}
      {/* Helmet */}
      <Rect x={x - 9} y={y - 18} width={18} height={16} rx={5} fill="#1E4D8C" />
      {/* Helmet top ridge */}
      <Rect x={x - 4} y={y - 21} width={8} height={5} rx={2} fill="#2A70D6" />
      {/* Antenna */}
      <Rect x={x + 3} y={y - 26} width={2} height={7} rx={1} fill="#888" />
      <Circle cx={x + 4} cy={y - 27} r={2} fill="#00D4FF" />
      {/* Visor / Face plate */}
      <Rect x={x - 7} y={y - 16} width={14} height={7} rx={3} fill="#001530" />
      {/* Visor glow */}
      <Rect x={x - 6} y={y - 15} width={12} height={5} rx={2.5} fill="#00AAFF" opacity={0.35} />
      {/* Eyes (anime style — two bright dots) */}
      <Circle cx={x - 3} cy={y - 13} r={2.2} fill="#00EEFF" />
      <Circle cx={x + 3} cy={y - 13} r={2.2} fill="#00EEFF" />
      <Circle cx={x - 3} cy={y - 13} r={1} fill="#FFFFFF" />
      <Circle cx={x + 3} cy={y - 13} r={1} fill="#FFFFFF" />
      {/* Chin */}
      <Rect x={x - 5} y={y - 4} width={10} height={3} rx={2} fill="#1A3A5C" />
    </G>
  );
}

// ─── Anime Zombie Bot ────────────────────────────────────────────────────────
function ZombieBot({ z }: { z: GameState["zombies"][0] }) {
  const { x, y, hp, maxHp, isDead } = z;

  if (isDead) {
    return (
      <G>
        {/* Sparks / wreck */}
        <Ellipse cx={x} cy={y + 4} rx={12} ry={5} fill="rgba(139,0,0,0.25)" />
        <Path d={`M ${x-8},${y-4} L ${x+6},${y+8}`} stroke="#8B0000" strokeWidth={3} strokeLinecap="round" opacity={0.6}/>
        <Path d={`M ${x+5},${y-5} L ${x-4},${y+9}`} stroke="#8B0000" strokeWidth={3} strokeLinecap="round" opacity={0.5}/>
        <Circle cx={x} cy={y} r={6} fill="#3D0000" opacity={0.5} />
      </G>
    );
  }

  const hpPct = hp / maxHp;
  // Zombie color shifts from green → red as HP drains
  const bodyR = Math.floor(60 + (1 - hpPct) * 100);
  const bodyG = Math.floor(120 * hpPct);
  const bodyB = Math.floor(30 * hpPct);
  const bodyColor = `rgb(${bodyR},${bodyG},${bodyB})`;
  const darkBody = `rgb(${Math.floor(bodyR * 0.6)},${Math.floor(bodyG * 0.6)},${Math.floor(bodyB * 0.6)})`;

  return (
    <G>
      {/* Shadow */}
      <Ellipse cx={x + 1} cy={y + 13} rx={11} ry={4} fill="rgba(0,0,0,0.25)" />

      {/* ── LEGS (bent / lurching) ── */}
      <Rect x={x - 7} y={y + 8} width={5} height={9} rx={2} fill={darkBody} transform={`rotate(-8, ${x-4}, ${y+8})`} />
      <Rect x={x + 2} y={y + 8} width={5} height={9} rx={2} fill={darkBody} transform={`rotate(8, ${x+4}, ${y+8})`} />
      <Rect x={x - 9} y={y + 15} width={7} height={3} rx={1.5} fill={darkBody} />
      <Rect x={x + 2} y={y + 15} width={7} height={3} rx={1.5} fill={darkBody} />

      {/* ── BODY ── */}
      <Rect x={x - 9} y={y - 4} width={18} height={13} rx={3} fill={bodyColor} />
      {/* Damage cracks on body */}
      <Path d={`M ${x-4},${y-2} L ${x-1},${y+3} L ${x+2},${y+1}`} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} fill="none" />
      {/* Corrupted core */}
      <Circle cx={x} cy={y + 3} r={3} fill="#8B0000" />
      <Circle cx={x} cy={y + 3} r={1.5} fill="#FF0000" opacity={0.7} />

      {/* ── ARMS (outstretched / lurch) ── */}
      <Rect x={x - 16} y={y - 5} width={8} height={5} rx={2} fill={bodyColor} transform={`rotate(-15, ${x-12}, ${y})`} />
      <Rect x={x + 8} y={y - 5} width={8} height={5} rx={2} fill={bodyColor} transform={`rotate(15, ${x+12}, ${y})`} />
      {/* Claw hands */}
      <Path d={`M ${x-18},${y-7} L ${x-20},${y-11} M ${x-17},${y-6} L ${x-20},${y-9} M ${x-16},${y-5} L ${x-18},${y-9}`}
        stroke={darkBody} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d={`M ${x+18},${y-7} L ${x+20},${y-11} M ${x+17},${y-6} L ${x+20},${y-9} M ${x+16},${y-5} L ${x+18},${y-9}`}
        stroke={darkBody} strokeWidth={2} strokeLinecap="round" fill="none" />

      {/* ── HEAD (cracked helmet) ── */}
      <Rect x={x - 8} y={y - 17} width={16} height={14} rx={4} fill={bodyColor} />
      {/* Cracked visor */}
      <Rect x={x - 6} y={y - 15} width={12} height={6} rx={2} fill="#1A0000" />
      {/* Crack line across visor */}
      <Path d={`M ${x-5},${y-15} L ${x-2},${y-12} L ${x+1},${y-14} L ${x+4},${y-10}`}
        stroke="rgba(255,0,0,0.5)" strokeWidth={1} fill="none" />
      {/* Glowing red eyes */}
      <Circle cx={x - 3} cy={y - 12} r={2.5} fill="#FF0000" />
      <Circle cx={x + 3} cy={y - 12} r={2.5} fill="#FF0000" />
      <Circle cx={x - 3} cy={y - 12} r={1.2} fill="#FF6060" />
      <Circle cx={x + 3} cy={y - 12} r={1.2} fill="#FF6060" />
      {/* Broken antenna stub */}
      <Rect x={x + 2} y={y - 20} width={2} height={4} rx={1} fill="#555" opacity={0.7} />

      {/* ── HP BAR ── */}
      <Rect x={x - 12} y={y - 25} width={24} height={3} fill="rgba(0,0,0,0.5)" rx={1.5} />
      <Rect
        x={x - 12} y={y - 25}
        width={24 * hpPct} height={3}
        fill={hpPct > 0.6 ? "#4CD964" : hpPct > 0.3 ? "#FFD60A" : "#FF3B30"}
        rx={1.5}
      />
    </G>
  );
}

// ─── Wilderness World ────────────────────────────────────────────────────────
function WildernessBackground() {
  // Deterministic "random" positions seeded by index
  const trees = useMemo(() => {
    const data = [
      { x: 60,  y: 80,  s: 1.1 }, { x: 180, y: 55,  s: 0.9 },
      { x: 320, y: 90,  s: 1.2 }, { x: 480, y: 65,  s: 0.85 },
      { x: 610, y: 80,  s: 1.0 }, { x: 740, y: 50,  s: 1.15 },
      { x: 850, y: 90,  s: 0.9 }, { x: 950, y: 60,  s: 1.0 },
      // sides
      { x: 20,  y: 230, s: 1.0 }, { x: 25,  y: 420, s: 1.1 },
      { x: 30,  y: 600, s: 0.9 }, { x: 22,  y: 750, s: 1.05 },
      { x: SW - 25, y: 200, s: 1.0 }, { x: SW - 20, y: 380, s: 0.9 },
      { x: SW - 28, y: 560, s: 1.1 }, { x: SW - 22, y: 700, s: 1.0 },
      // bottom edge
      { x: 80,  y: SH - 60, s: 1.0 }, { x: 220, y: SH - 50, s: 0.9 },
      { x: 380, y: SH - 65, s: 1.1 }, { x: 540, y: SH - 55, s: 0.85 },
      { x: 700, y: SH - 60, s: 1.0 }, { x: 860, y: SH - 50, s: 1.15 },
    ];
    return data;
  }, []);

  const rocks = useMemo(() => [
    { x: 140, y: 170, rx: 12, ry: 8 },
    { x: 700, y: 200, rx: 10, ry: 7 },
    { x: 260, y: 520, rx: 14, ry: 9 },
    { x: 820, y: 450, rx: 11, ry: 7 },
    { x: 450, y: 140, rx: 9, ry: 6 },
    { x: 130, y: 620, rx: 13, ry: 8 },
    { x: 760, y: 650, rx: 10, ry: 7 },
  ], []);

  const bushes = useMemo(() => [
    { x: 200, y: 130 }, { x: 650, y: 115 }, { x: 100, y: 350 },
    { x: 880, y: 320 }, { x: 300, y: 680 }, { x: 600, y: 700 },
    { x: 420, y: 250 }, { x: 750, y: 530 },
  ], []);

  const grassTufts = useMemo(() => {
    const tufts = [];
    for (let i = 0; i < 60; i++) {
      // Deterministic positions
      const t = i * 137.508;
      const tx = (Math.sin(t) * 0.5 + 0.5) * (SW - 60) + 30;
      const ty = (Math.cos(t * 0.7) * 0.5 + 0.5) * (SH - 60) + 30;
      tufts.push({ x: tx, y: ty, size: 4 + (i % 4) });
    }
    return tufts;
  }, []);

  return (
    <G>
      {/* ── BASE GROUND — rich green grass ── */}
      <Rect x={0} y={0} width={SW} height={SH} fill="#2D6A1F" />

      {/* ── GRASS VARIATION PATCHES ── */}
      <Ellipse cx={SW * 0.2} cy={SH * 0.3} rx={120} ry={80} fill="#2A6018" opacity={0.6} />
      <Ellipse cx={SW * 0.75} cy={SH * 0.25} rx={100} ry={70} fill="#326E20" opacity={0.5} />
      <Ellipse cx={SW * 0.5} cy={SH * 0.55} rx={150} ry={90} fill="#28580F" opacity={0.5} />
      <Ellipse cx={SW * 0.15} cy={SH * 0.7} rx={90} ry={60} fill="#3A7A26" opacity={0.4} />
      <Ellipse cx={SW * 0.8} cy={SH * 0.65} rx={110} ry={70} fill="#2A6018" opacity={0.4} />
      <Ellipse cx={SW * 0.4} cy={SH * 0.2} rx={80} ry={55} fill="#326E20" opacity={0.4} />

      {/* ── DIRT PATH (center clearing / arena) ── */}
      <Ellipse cx={SW / 2} cy={SH / 2} rx={SW * 0.35} ry={SH * 0.28} fill="#8B6914" opacity={0.25} />
      <Ellipse cx={SW / 2} cy={SH / 2} rx={SW * 0.25} ry={SH * 0.2} fill="#9B7A20" opacity={0.15} />

      {/* ── GRASS TUFTS ── */}
      {grassTufts.map((t, i) => (
        <G key={`tuft-${i}`}>
          <Path
            d={`M ${t.x},${t.y} Q ${t.x - t.size},${t.y - t.size * 2} ${t.x - t.size * 0.5},${t.y - t.size * 2.5}`}
            stroke="#1E4F10" strokeWidth={1.5} fill="none" opacity={0.7}
          />
          <Path
            d={`M ${t.x},${t.y} Q ${t.x},${t.y - t.size * 2.5} ${t.x},${t.y - t.size * 3}`}
            stroke="#245E14" strokeWidth={1.5} fill="none" opacity={0.6}
          />
          <Path
            d={`M ${t.x},${t.y} Q ${t.x + t.size},${t.y - t.size * 2} ${t.x + t.size * 0.5},${t.y - t.size * 2.5}`}
            stroke="#1E4F10" strokeWidth={1.5} fill="none" opacity={0.7}
          />
        </G>
      ))}

      {/* ── ROCKS ── */}
      {rocks.map((r, i) => (
        <G key={`rock-${i}`}>
          <Ellipse cx={r.x + 2} cy={r.y + 3} rx={r.rx} ry={r.ry} fill="rgba(0,0,0,0.2)" />
          <Ellipse cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill="#7A7A6A" />
          <Ellipse cx={r.x - 2} cy={r.y - 2} rx={r.rx * 0.5} ry={r.ry * 0.4} fill="#9A9A8A" opacity={0.6} />
        </G>
      ))}

      {/* ── BUSHES ── */}
      {bushes.map((b, i) => (
        <G key={`bush-${i}`}>
          <Circle cx={b.x + 1} cy={b.y + 3} r={13} fill="rgba(0,0,0,0.2)" />
          <Circle cx={b.x - 7} cy={b.y + 2} r={9} fill="#1A5C10" />
          <Circle cx={b.x + 5} cy={b.y} r={11} fill="#1E6812" />
          <Circle cx={b.x - 2} cy={b.y - 3} r={10} fill="#226E16" />
          <Circle cx={b.x + 8} cy={b.y + 3} r={8} fill="#1A5C10" />
          {/* Berry dots */}
          <Circle cx={b.x + 3} cy={b.y - 2} r={2} fill="#CC2222" opacity={0.8} />
          <Circle cx={b.x - 4} cy={b.y + 1} r={2} fill="#CC2222" opacity={0.8} />
        </G>
      ))}

      {/* ── TREES ── */}
      {trees.map((t, i) => {
        const s = t.s;
        return (
          <G key={`tree-${i}`}>
            {/* Shadow */}
            <Ellipse cx={t.x + 4} cy={t.y + 10} rx={14 * s} ry={6 * s} fill="rgba(0,0,0,0.3)" />
            {/* Trunk */}
            <Rect
              x={t.x - 5 * s} y={t.y - 5 * s}
              width={10 * s} height={20 * s}
              rx={3 * s}
              fill="#5C3D1E"
            />
            <Rect
              x={t.x - 3 * s} y={t.y - 5 * s}
              width={4 * s} height={16 * s}
              rx={2 * s}
              fill="#7A5230"
              opacity={0.5}
            />
            {/* Foliage — layered circles */}
            <Circle cx={t.x} cy={t.y - 18 * s} r={20 * s} fill="#145A0A" />
            <Circle cx={t.x - 8 * s} cy={t.y - 12 * s} r={16 * s} fill="#1A6E10" />
            <Circle cx={t.x + 8 * s} cy={t.y - 12 * s} r={15 * s} fill="#1A6E10" />
            <Circle cx={t.x} cy={t.y - 10 * s} r={18 * s} fill="#1E7A14" />
            {/* Top highlight */}
            <Circle cx={t.x - 4 * s} cy={t.y - 22 * s} r={8 * s} fill="#26961A" opacity={0.6} />
          </G>
        );
      })}

      {/* ── EDGE VIGNETTE (darkening at borders — fog of war) ── */}
      <Rect x={0} y={0} width={SW} height={50} fill="rgba(0,20,0,0.4)" />
      <Rect x={0} y={SH - 50} width={SW} height={50} fill="rgba(0,20,0,0.4)" />
      <Rect x={0} y={0} width={40} height={SH} fill="rgba(0,20,0,0.35)" />
      <Rect x={SW - 40} y={0} width={40} height={SH} fill="rgba(0,20,0,0.35)" />
    </G>
  );
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────
export function GameCanvas({ state }: Props) {
  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="explosionGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFDD44" stopOpacity="1" />
            <Stop offset="30%" stopColor="#FF6B35" stopOpacity="0.85" />
            <Stop offset="70%" stopColor="#FF3B30" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="bulletGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── WORLD ── */}
        <WildernessBackground />

        {/* ── EXPLOSIONS ── */}
        {state.explosions.map((e) => (
          <G key={e.id}>
            <Circle cx={e.x} cy={e.y} r={e.radius * 1.2} fill="url(#explosionGrad)" opacity={0.6} />
            <Circle cx={e.x} cy={e.y} r={e.radius * 0.4} fill="#FFDD44" opacity={0.9} />
          </G>
        ))}

        {/* ── BULLETS ── */}
        {state.bullets.map((b) => {
          const col = getWeaponColor(b.weaponId);
          return (
            <G key={b.id}>
              {b.isExplosive ? (
                <>
                  {/* Rocket */}
                  <Circle cx={b.x} cy={b.y} r={8} fill="#FF6B35" opacity={0.5} />
                  <Circle cx={b.x} cy={b.y} r={5} fill="#FFD700" opacity={0.9} />
                  <Circle cx={b.x} cy={b.y} r={2.5} fill="#FFFFFF" />
                </>
              ) : (
                <>
                  {/* Tracer glow */}
                  <Circle cx={b.x} cy={b.y} r={5} fill={col} opacity={0.25} />
                  <Circle cx={b.x} cy={b.y} r={3} fill={col} opacity={0.7} />
                  <Circle cx={b.x} cy={b.y} r={1.5} fill="#FFFFFF" />
                </>
              )}
            </G>
          );
        })}

        {/* ── ZOMBIE BOTS ── */}
        {state.zombies.map((z) => (
          <ZombieBot key={z.id} z={z} />
        ))}

        {/* ── PLAYER BOT ── */}
        <PlayerBot x={state.player.x} y={state.player.y} angle={state.player.angle} />
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
