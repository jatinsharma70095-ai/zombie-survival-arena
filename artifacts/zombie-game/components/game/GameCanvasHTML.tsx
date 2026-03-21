import React, { useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { GameState } from "./GameEngine";

interface Props { state: GameState; }

interface BloodSplatter { id: string; x: number; y: number; r: number; alpha: number; drops: Array<{ dx: number; dy: number; r: number }>; }
interface Particle { id: string; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }

// Polyfill roundRect for browsers that don't support it
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const WEAPON_COLORS: Record<string, string> = {
  pistol: "#FFD60A", shotgun: "#FF9F0A", sniper: "#30D158",
  uzi: "#007AFF", minigun: "#FF375F", bazooka: "#FF6B35",
};

function idGen() { return Math.random().toString(36).substr(2, 9); }

function drawCrackedGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#0D0D0D";
  ctx.fillRect(0, 0, w, h);

  // Dirt patches
  const patches = [
    [w * 0.15, h * 0.2, 120, 90], [w * 0.7, h * 0.15, 100, 75],
    [w * 0.45, h * 0.5, 180, 120], [w * 0.1, h * 0.7, 90, 65],
    [w * 0.8, h * 0.65, 110, 80], [w * 0.35, h * 0.85, 130, 70],
    [w * 0.6, h * 0.35, 95, 65],
  ];
  patches.forEach(([px, py, rx, ry]) => {
    const g = ctx.createRadialGradient(px, py, 0, px, py, Math.max(rx, ry));
    g.addColorStop(0, "rgba(35,25,15,0.6)");
    g.addColorStop(1, "rgba(35,25,15,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Cracks
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 1.5;
  const cracks = [
    [[w*0.1,h*0.1],[w*0.18,h*0.22],[w*0.14,h*0.35]],
    [[w*0.55,h*0.05],[w*0.6,h*0.18],[w*0.58,h*0.3],[w*0.65,h*0.38]],
    [[w*0.8,h*0.2],[w*0.72,h*0.35],[w*0.78,h*0.5]],
    [[w*0.2,h*0.55],[w*0.3,h*0.6],[w*0.25,h*0.75]],
    [[w*0.7,h*0.6],[w*0.65,h*0.72],[w*0.75,h*0.85]],
    [[w*0.4,h*0.4],[w*0.5,h*0.45],[w*0.45,h*0.55],[w*0.52,h*0.65]],
    [[w*0.9,h*0.4],[w*0.85,h*0.55]],
    [[w*0.05,h*0.5],[w*0.12,h*0.62]],
  ];
  cracks.forEach(pts => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
    // Sub-crack
    if (pts.length > 1) {
      const mid = pts[Math.floor(pts.length / 2)];
      ctx.beginPath();
      ctx.moveTo(mid[0], mid[1]);
      ctx.lineTo(mid[0] + (Math.random() - 0.5) * 40, mid[1] + (Math.random() - 0.5) * 40);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1.5;
    }
  });

  // Rubble/debris
  const rubble = [
    [w*0.22,h*0.18,8,5], [w*0.68,h*0.12,6,4], [w*0.85,h*0.35,9,5],
    [w*0.15,h*0.65,7,4], [w*0.75,h*0.75,8,5], [w*0.42,h*0.28,5,3],
    [w*0.55,h*0.72,6,4], [w*0.33,h*0.88,7,4],
  ];
  rubble.forEach(([rx, ry, rw, rh]) => {
    ctx.fillStyle = "#1A1A1A";
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#252525";
    ctx.beginPath();
    ctx.ellipse(rx - rw * 0.2, ry - rh * 0.2, rw * 0.5, rh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, time: number) {
  const walkAnim = Math.sin(time * 0.008) * 3;

  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(1, 15, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#1E3A5F";
  rr(ctx, -10, -4, 20, 14, 4); ctx.fill();

  // Chest stripe
  ctx.fillStyle = "rgba(0,180,255,0.5)";
  ctx.fillRect(-6, -1, 12, 3);

  // Core glow
  ctx.fillStyle = "#00D4FF";
  ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(0, 4, 1.5, 0, Math.PI * 2); ctx.fill();

  // Legs with walk animation
  ctx.fillStyle = "#0F2840";
  const legOffset = walkAnim;
  rr(ctx, -8, 8 + legOffset, 6, 10, 3); ctx.fill();
  rr(ctx, 2, 8 - legOffset, 6, 10, 3); ctx.fill();

  // Left arm
  ctx.fillStyle = "#1A3A5C";
  rr(ctx, -15, -2, 6, 9, 3); ctx.fill();

  // Right arm + weapon (rotated)
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = "#1A3A5C";
  rr(ctx, 9, -3, 6, 9, 3); ctx.fill();
  ctx.fillStyle = "#2D2D2D";
  rr(ctx, 12, -2, 16, 4, 2); ctx.fill();
  ctx.fillStyle = "#555";
  rr(ctx, 24, -1, 7, 2, 1); ctx.fill();
  ctx.restore();

  // Head
  ctx.fillStyle = "#1E3A5F";
  rr(ctx, -9, -18, 18, 16, 5); ctx.fill();

  // Helmet top
  ctx.fillStyle = "#2A70D6";
  rr(ctx, -4, -21, 8, 5, 2); ctx.fill();

  // Visor
  ctx.fillStyle = "#001530";
  rr(ctx, -7, -16, 14, 7, 3); ctx.fill();
  ctx.fillStyle = "rgba(0,170,255,0.4)";
  rr(ctx, -6, -15, 12, 5, 2.5); ctx.fill();

  // Eyes
  ctx.fillStyle = "#00EEFF";
  ctx.beginPath(); ctx.arc(-3, -12, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -12, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-3, -12, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -12, 1, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawZombie(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, isDead: boolean, time: number, walkPhase: number) {
  ctx.save();
  ctx.translate(x, y);

  if (isDead) {
    ctx.fillStyle = "rgba(120,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(0, 4, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(180,0,0,0.5)";
    ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(6, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(-4, 9); ctx.stroke();
    ctx.restore(); return;
  }

  const hpPct = hp / maxHp;
  const walkAnim = Math.sin(time * 0.006 + walkPhase) * 4;
  const bodyR = Math.floor(60 + (1 - hpPct) * 110);
  const bodyG = Math.floor(110 * hpPct);
  const bodyB = Math.floor(20 * hpPct);
  const bodyColor = `rgb(${bodyR},${bodyG},${bodyB})`;
  const darkBody = `rgb(${Math.floor(bodyR * 0.55)},${Math.floor(bodyG * 0.55)},${Math.floor(bodyB * 0.55)})`;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(1, 13, 11, 4, 0, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.fillStyle = darkBody;
  ctx.save(); ctx.rotate(-0.14);
  rr(ctx, -7, 8 + walkAnim, 5, 9, 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.rotate(0.14);
  rr(ctx, 2, 8 - walkAnim, 5, 9, 2); ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = bodyColor;
  rr(ctx, -9, -4, 18, 13, 3); ctx.fill();

  // Body damage lines
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-1, 3); ctx.lineTo(2, 1); ctx.stroke();

  // Corrupt core
  ctx.fillStyle = "#8B0000";
  ctx.beginPath(); ctx.arc(0, 3, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,0,0,0.7)";
  ctx.beginPath(); ctx.arc(0, 3, 1.5, 0, Math.PI * 2); ctx.fill();

  // Arms outstretched (lurching)
  ctx.fillStyle = bodyColor;
  const lurch = Math.sin(time * 0.004 + walkPhase) * 0.2;
  ctx.save(); ctx.rotate(-0.26 + lurch);
  rr(ctx, -16, -5, 8, 5, 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.rotate(0.26 - lurch);
  rr(ctx, 8, -5, 8, 5, 2); ctx.fill();
  ctx.restore();

  // Head
  ctx.fillStyle = bodyColor;
  rr(ctx, -8, -17, 16, 14, 4); ctx.fill();

  // Cracked visor
  ctx.fillStyle = "#1A0000";
  rr(ctx, -6, -15, 12, 6, 2); ctx.fill();

  // Glowing red eyes
  ctx.fillStyle = "#FF0000";
  ctx.shadowColor = "#FF0000"; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(-3, -12, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -12, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#FF6060";
  ctx.beginPath(); ctx.arc(-3, -12, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -12, 1.2, 0, Math.PI * 2); ctx.fill();

  // HP bar
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  rr(ctx, -12, -25, 24, 3, 1.5); ctx.fill();
  ctx.fillStyle = hpPct > 0.6 ? "#4CD964" : hpPct > 0.3 ? "#FFD60A" : "#FF3B30";
  if (24 * hpPct > 0) { rr(ctx, -12, -25, 24 * hpPct, 3, 1.5); ctx.fill(); }

  ctx.restore();
}

function drawFog(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const wisps = [
    { x: 0.1, y: 0.3, sx: 0.8, sy: 0.3, spd: 0.00012, phase: 0 },
    { x: 0.5, y: 0.1, sx: 0.6, sy: 0.2, spd: 0.00009, phase: 1.2 },
    { x: 0.8, y: 0.5, sx: 0.7, sy: 0.25, spd: 0.00014, phase: 2.4 },
    { x: 0.2, y: 0.7, sx: 0.5, sy: 0.2, spd: 0.0001, phase: 0.7 },
    { x: 0.6, y: 0.85, sx: 0.65, sy: 0.22, spd: 0.00011, phase: 1.8 },
    { x: 0.05, y: 0.55, sx: 0.4, sy: 0.18, spd: 0.00013, phase: 3.1 },
    { x: 0.9, y: 0.25, sx: 0.45, sy: 0.19, spd: 0.0001, phase: 0.4 },
  ];

  ctx.globalCompositeOperation = "source-over";
  wisps.forEach((wisp) => {
    const ox = Math.sin(time * wisp.spd + wisp.phase) * 0.08;
    const oy = Math.cos(time * wisp.spd * 1.3 + wisp.phase) * 0.04;
    const cx = (wisp.x + ox) * w;
    const cy = (wisp.y + oy) * h;
    const rx = wisp.sx * w * (0.9 + Math.sin(time * 0.0002 + wisp.phase) * 0.1);
    const ry = wisp.sy * h * (0.9 + Math.cos(time * 0.00017 + wisp.phase) * 0.1);
    const alpha = 0.06 + Math.sin(time * 0.0003 + wisp.phase) * 0.025;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, `rgba(200,180,160,${alpha})`);
    g.addColorStop(0.5, `rgba(180,160,140,${alpha * 0.5})`);
    g.addColorStop(1, "rgba(180,160,140,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.sin(time * 0.00005 + wisp.phase) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Dark edges
  const gTop = ctx.createLinearGradient(0, 0, 0, h * 0.25);
  gTop.addColorStop(0, "rgba(0,0,0,0.7)"); gTop.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gTop; ctx.fillRect(0, 0, w, h * 0.25);

  const gBot = ctx.createLinearGradient(0, h * 0.75, 0, h);
  gBot.addColorStop(0, "rgba(0,0,0,0)"); gBot.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = gBot; ctx.fillRect(0, h * 0.75, w, h * 0.25);

  const gLeft = ctx.createLinearGradient(0, 0, w * 0.2, 0);
  gLeft.addColorStop(0, "rgba(0,0,0,0.5)"); gLeft.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gLeft; ctx.fillRect(0, 0, w * 0.2, h);

  const gRight = ctx.createLinearGradient(w * 0.8, 0, w, 0);
  gRight.addColorStop(0, "rgba(0,0,0,0)"); gRight.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = gRight; ctx.fillRect(w * 0.8, 0, w * 0.2, h);

  // Red atmospheric tint
  const redG = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.15, w * 0.5, h * 0.5, h * 0.9);
  redG.addColorStop(0, "rgba(80,0,0,0)");
  redG.addColorStop(0.6, "rgba(80,0,0,0.08)");
  redG.addColorStop(1, "rgba(120,0,0,0.25)");
  ctx.fillStyle = redG;
  ctx.fillRect(0, 0, w, h);
}

export function GameCanvasHTML({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgDrawnRef = useRef(false);
  const rafRef = useRef(0);
  const timeRef = useRef(Date.now());

  // Visual effect state
  const bloodSplattersRef = useRef<BloodSplatter[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevKillsRef = useRef(state.kills);
  const prevBulletCountRef = useRef(state.bullets.length);
  const prevHpRef = useRef(state.playerHp);
  const shakeRef = useRef(0);
  const damageFlashRef = useRef(0);
  const stateRef = useRef(state);
  const muzzleFlashRef = useRef({ active: false, x: 0, y: 0, angle: 0, timer: 0 });

  stateRef.current = state;

  // Detect events from state changes
  useEffect(() => {
    const s = stateRef.current;

    // Damage event
    if (s.playerHp < prevHpRef.current) {
      shakeRef.current = 10;
      damageFlashRef.current = 0.55;
    }
    prevHpRef.current = s.playerHp;

    // Kill events → blood splatters + particles
    if (s.kills > prevKillsRef.current) {
      s.recentKills.forEach(kill => {
        if (Date.now() - kill.time < 200) {
          bloodSplattersRef.current.push({
            id: kill.id,
            x: kill.x, y: kill.y,
            r: 18 + Math.random() * 14,
            alpha: 0.85,
            drops: Array.from({ length: 8 }, () => ({
              dx: (Math.random() - 0.5) * 40,
              dy: (Math.random() - 0.5) * 40,
              r: 3 + Math.random() * 7,
            })),
          });
          // Explosion particles for zombie death
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particlesRef.current.push({
              id: idGen(), x: kill.x, y: kill.y,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              life: 1, maxLife: 1, color: "#8B0000", size: 3 + Math.random() * 4,
            });
          }
        }
      });
      prevKillsRef.current = s.kills;
    }

    // Muzzle flash
    if (s.bullets.length > prevBulletCountRef.current) {
      muzzleFlashRef.current = {
        active: true,
        x: s.lastShotX, y: s.lastShotY,
        angle: s.lastShotAngle,
        timer: 80,
      };
    }
    prevBulletCountRef.current = s.bullets.length;
  }, [state]);

  // Explosion particles
  useEffect(() => {
    state.explosions.forEach(exp => {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 6;
        const colors = ["#FFDD44", "#FF6B35", "#FF3B30", "#FF9900"];
        particlesRef.current.push({
          id: idGen(), x: exp.x, y: exp.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 8,
        });
      }
    });
  }, [state.explosions.length]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    if (!canvas || !bgCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const now = Date.now();
    const elapsed = now - timeRef.current;

    // Draw static background once
    if (!bgDrawnRef.current) {
      const bgCtx = bgCanvas.getContext("2d");
      if (bgCtx) {
        bgCanvas.width = w; bgCanvas.height = h;
        drawCrackedGround(bgCtx, w, h);
        bgDrawnRef.current = true;
      }
    }

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - 0.4);
      const intensity = shakeRef.current;
      shakeX = (Math.random() - 0.5) * intensity * 1.5;
      shakeY = (Math.random() - 0.5) * intensity * 1.5;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Draw background
    ctx.drawImage(bgCanvas, 0, 0, w, h);

    // Blood splatters (static, behind everything)
    bloodSplattersRef.current.forEach(sp => {
      ctx.fillStyle = `rgba(120,0,0,${sp.alpha * 0.6})`;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); ctx.fill();
      sp.drops.forEach(d => {
        ctx.fillStyle = `rgba(100,0,0,${sp.alpha * 0.5})`;
        ctx.beginPath(); ctx.arc(sp.x + d.dx, sp.y + d.dy, d.r, 0, Math.PI * 2); ctx.fill();
      });
    });

    // Fog layer
    drawFog(ctx, w, h, elapsed);

    // Explosions
    const s = stateRef.current;
    s.explosions.forEach(exp => {
      const age = (Date.now() - exp.createdAt) / 500;
      const r = exp.radius * (0.5 + age * 0.8);
      const alpha = 1 - age;
      const g = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, r);
      g.addColorStop(0, `rgba(255,220,50,${alpha})`);
      g.addColorStop(0.3, `rgba(255,107,53,${alpha * 0.8})`);
      g.addColorStop(0.7, `rgba(255,50,0,${alpha * 0.4})`);
      g.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(exp.x, exp.y, r, 0, Math.PI * 2); ctx.fill();
      // Smoke ring
      ctx.strokeStyle = `rgba(60,40,20,${alpha * 0.4})`;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(exp.x, exp.y, r * 0.8, 0, Math.PI * 2); ctx.stroke();
    });

    // Bullets
    s.bullets.forEach(b => {
      const col = WEAPON_COLORS[b.weaponId] ?? "#FFD60A";
      if (b.isExplosive) {
        ctx.fillStyle = "rgba(255,107,53,0.5)";
        ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        // Trail
        ctx.strokeStyle = col + "44";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 2.5, b.y - b.vy * 2.5);
        ctx.stroke();
        // Core
        ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Zombies (behind player)
    s.zombies.forEach(z => {
      drawZombie(ctx, z.x, z.y, z.hp, z.maxHp, z.isDead, elapsed, z.walkPhase);
    });

    // Player
    drawPlayer(ctx, s.player.x, s.player.y, s.player.angle, elapsed);

    // Muzzle flash
    const mf = muzzleFlashRef.current;
    if (mf.active && mf.timer > 0) {
      mf.timer -= 16;
      if (mf.timer <= 0) { mf.active = false; }
      else {
        const alpha = mf.timer / 80;
        ctx.save();
        ctx.translate(mf.x, mf.y);
        ctx.rotate(mf.angle);
        const muzzleGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
        muzzleGrad.addColorStop(0, `rgba(255,255,200,${alpha})`);
        muzzleGrad.addColorStop(0.4, `rgba(255,180,50,${alpha * 0.7})`);
        muzzleGrad.addColorStop(1, "rgba(255,100,0,0)");
        ctx.fillStyle = muzzleGrad;
        ctx.beginPath();
        ctx.ellipse(8, 0, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.92; p.vy *= 0.92;
      p.vy += 0.1;
      p.life -= 0.04;
      if (p.life <= 0) return;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Vignette + atmosphere
    drawVignette(ctx, w, h);

    // Damage flash
    if (damageFlashRef.current > 0) {
      ctx.fillStyle = `rgba(200,0,0,${damageFlashRef.current})`;
      ctx.fillRect(0, 0, w, h);
      damageFlashRef.current = Math.max(0, damageFlashRef.current - 0.025);
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawFrame]);

  if (Platform.OS !== "web") return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <canvas
        ref={bgCanvasRef as any}
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef as any}
        width={typeof window !== "undefined" ? window.innerWidth : 390}
        height={typeof window !== "undefined" ? window.innerHeight : 844}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
