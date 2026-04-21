import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Dimensions } from "react-native";
import { WeaponId, WEAPONS, HORDE_LEVELS } from "@/context/GameContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
export const GAME_W = SCREEN_W;
export const GAME_H = SCREEN_H;

const PLAYER_RADIUS = 16;
const ZOMBIE_RADIUS = 14;
const BULLET_RADIUS = 5;
const PLAYER_SPEED = 3.5;
const ZOMBIE_BASE_SPEED = 1.1;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 1.5;
const STAMINA_REGEN = 1.2;
const STAMINA_RECOVER_DELAY = 8000;
const KILL_STREAK_COUNT = 5;
const KILL_STREAK_WINDOW = 8000;
const KILL_STREAK_BONUS = 10;
const BURN_DURATION = 3000;
const BURN_DPS = 12;
const SPRINTER_SPEED_MULT = 2.6;
const SPRINTER_HP_MULT = 0.55;
const SPRINTER_CHANCE_FROM_LEVEL = 5;
const HORDE_EXTRA_COUNT = 14;
const DEFAULT_EXPLOSION_RADIUS = 80;

export interface Position { x: number; y: number; }

export interface Bullet {
  id: string; x: number; y: number;
  vx: number; vy: number; damage: number;
  range: number; distanceTraveled: number;
  weaponId: WeaponId; isExplosive: boolean;
  explosionRadius?: number;
}

export interface Zombie {
  id: string; x: number; y: number;
  hp: number; maxHp: number; speed: number;
  isDead: boolean; deathTime?: number;
  walkPhase: number;
  isSprinter?: boolean;
  burnUntil?: number;
}

export interface Explosion {
  id: string; x: number; y: number;
  createdAt: number; radius: number;
}

export interface RecentKill {
  id: string; x: number; y: number; time: number;
}

export interface GameState {
  player: Position & { angle: number };
  playerHp: number; maxHp: number;
  stamina: number;
  bullets: Bullet[];
  zombies: Zombie[];
  explosions: Explosion[];
  score: number; kills: number;
  ammo: number; maxAmmo: number;
  isReloading: boolean; reloadProgress: number;
  currentWeapon: WeaponId;
  level: number; wave: number;
  zombiesRemainingInWave: number;
  gameOver: boolean; victory: boolean;
  staminaExhausted: boolean;
  lastDamageTime: number;
  lastShotTime: number;
  lastShotAngle: number;
  lastShotX: number;
  lastShotY: number;
  recentKills: RecentKill[];
  killStreakBonus: number;
  isEndless: boolean;
  endlessRound: number;
  hordeActive: boolean;
}

export interface GameEngineHandle {
  getState: () => GameState;
  shoot: (tx: number, ty: number) => void;
  shootAtNearest: () => void;
  movePlayer: (dx: number, dy: number, sprinting: boolean) => void;
  reload: () => void;
  setWeapon: (weaponId: WeaponId) => void;
  startGame: (level: number, weapon: WeaponId, endless?: boolean) => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

function getLevelConfig(level: number, isEndless: boolean, endlessRound: number) {
  const effectiveLevel = isEndless ? MAX_ENDLESS_LEVEL + endlessRound * 3 : level;
  const t = 1 + (effectiveLevel - 1) * 0.08;
  const waveBase = isEndless ? [8, 12, 18] : [4, 7, 10];
  return {
    toughMult: t,
    waveSizes: waveBase.map(b => Math.floor(b * t)),
    totalWaves: 3,
    zombieHp: Math.floor(50 * t),
    zombieSpeed: ZOMBIE_BASE_SPEED * (1 + (effectiveLevel - 1) * 0.04),
    zombieDamage: Math.floor(8 * t),
    sprinterChance: effectiveLevel >= SPRINTER_CHANCE_FROM_LEVEL
      ? Math.min(0.45, 0.15 + (effectiveLevel - SPRINTER_CHANCE_FROM_LEVEL) * 0.015)
      : 0,
  };
}

const MAX_ENDLESS_LEVEL = 50;

function spawnZombies(count: number, cfg: ReturnType<typeof getLevelConfig>): Zombie[] {
  return Array.from({ length: count }, (_, i) => {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * GAME_W; y = -50; }
    else if (side === 1) { x = GAME_W + 50; y = Math.random() * GAME_H; }
    else if (side === 2) { x = Math.random() * GAME_W; y = GAME_H + 50; }
    else { x = -50; y = Math.random() * GAME_H; }

    const isSprinter = Math.random() < cfg.sprinterChance;
    const hp = isSprinter
      ? Math.floor(cfg.zombieHp * SPRINTER_HP_MULT)
      : cfg.zombieHp;
    const speed = isSprinter
      ? (cfg.zombieSpeed + (Math.random() - 0.5) * 0.3) * SPRINTER_SPEED_MULT
      : cfg.zombieSpeed + (Math.random() - 0.5) * 0.4;

    return {
      id: `z-${Date.now()}-${i}-${Math.random()}`,
      x, y, hp, maxHp: hp,
      speed, isDead: false,
      walkPhase: Math.random() * Math.PI * 2,
      isSprinter,
    };
  });
}

function idGen() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

export const GameEngine = React.forwardRef<
  GameEngineHandle,
  {
    onStateChange: (s: GameState) => void;
    onGameEnd: (won: boolean, kills: number, streakBonus: number, score: number) => void;
    onKillStreak?: (bonus: number) => void;
    onHorde?: () => void;
  }
>(({ onStateChange, onGameEnd, onKillStreak, onHorde }, ref) => {
  const stateRef = useRef<GameState | null>(null);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const lastFireRef = useRef(0);
  const isReloadingRef = useRef(false);
  const reloadStartRef = useRef(0);
  const staminaExhaustedTimeRef = useRef(0);
  const configRef = useRef(getLevelConfig(1, false, 0));
  const killTimestampsRef = useRef<number[]>([]);
  const streakBonusRef = useRef(0);
  const hordeFiredRef = useRef<Set<number>>(new Set());

  const initState = useCallback((level: number, weapon: WeaponId, endless = false): GameState => {
    const cfg = getLevelConfig(level, endless, 0);
    configRef.current = cfg;
    const w = WEAPONS[weapon];
    killTimestampsRef.current = [];
    streakBonusRef.current = 0;
    hordeFiredRef.current = new Set();
    return {
      player: { x: GAME_W / 2, y: GAME_H / 2, angle: 0 },
      playerHp: 100, maxHp: 100,
      stamina: STAMINA_MAX,
      bullets: [], zombies: [], explosions: [],
      score: 0, kills: 0,
      ammo: w.ammoCapacity, maxAmmo: w.ammoCapacity,
      isReloading: false, reloadProgress: 0,
      currentWeapon: weapon,
      level, wave: 0, zombiesRemainingInWave: 0,
      gameOver: false, victory: false,
      staminaExhausted: false,
      lastDamageTime: 0, lastShotTime: 0,
      lastShotAngle: 0, lastShotX: 0, lastShotY: 0,
      recentKills: [],
      killStreakBonus: 0,
      isEndless: endless,
      endlessRound: 0,
      hordeActive: false,
    };
  }, []);

  const recordKill = useCallback((ts: number) => {
    const now = ts;
    killTimestampsRef.current.push(now);
    killTimestampsRef.current = killTimestampsRef.current.filter(t => now - t < KILL_STREAK_WINDOW);
    if (killTimestampsRef.current.length >= KILL_STREAK_COUNT) {
      killTimestampsRef.current = [];
      streakBonusRef.current += KILL_STREAK_BONUS;
      onKillStreak?.(KILL_STREAK_BONUS);
      return KILL_STREAK_BONUS;
    }
    return 0;
  }, [onKillStreak]);

  const tick = useCallback((ts: number) => {
    if (pausedRef.current || !stateRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const dt = lastTimeRef.current ? Math.min(ts - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = ts;
    const s = stateRef.current;
    if (s.gameOver || s.victory) return;

    const cfg = configRef.current;
    const RELOAD_TIME = 1500;

    // Wave spawn logic
    if (s.zombiesRemainingInWave === 0 && s.zombies.filter(z => !z.isDead).length === 0) {
      const nw = s.wave + 1;

      if (nw > cfg.totalWaves) {
        // All waves done
        if (s.isEndless) {
          // Endless: start a new round with escalated difficulty
          const newRound = s.endlessRound + 1;
          const newCfg = getLevelConfig(s.level, true, newRound);
          configRef.current = newCfg;
          const sz = newCfg.waveSizes[0];
          stateRef.current = {
            ...s,
            endlessRound: newRound,
            wave: 1,
            zombiesRemainingInWave: sz,
            zombies: spawnZombies(sz, newCfg),
            hordeActive: false,
          };
          onStateChange({ ...stateRef.current });
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        // Normal: victory
        stateRef.current = { ...s, victory: true };
        onStateChange({ ...stateRef.current });
        onGameEnd(true, s.kills, streakBonusRef.current, s.score);
        return;
      }

      const sz = cfg.waveSizes[nw - 1] ?? cfg.waveSizes[cfg.waveSizes.length - 1];
      let newZombies = spawnZombies(sz, cfg);
      let hordeActive = false;

      // Horde event: at horde levels when wave 2 starts
      const isHordeLevel = HORDE_LEVELS.includes(s.level);
      if (nw === 2 && isHordeLevel && !hordeFiredRef.current.has(s.level)) {
        hordeFiredRef.current.add(s.level);
        const hordeZombies = spawnZombies(HORDE_EXTRA_COUNT, { ...cfg, sprinterChance: 0.5 });
        newZombies = [...newZombies, ...hordeZombies];
        hordeActive = true;
        onHorde?.();
      }

      stateRef.current = { ...s, wave: nw, zombiesRemainingInWave: sz, zombies: newZombies, hordeActive };
      onStateChange({ ...stateRef.current });
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Reload
    let { isReloading, reloadProgress, ammo, maxAmmo } = s;
    if (isReloading) {
      reloadProgress = Math.min((ts - reloadStartRef.current) / RELOAD_TIME, 1);
      if (reloadProgress >= 1) {
        isReloading = false; isReloadingRef.current = false;
        reloadProgress = 0; ammo = maxAmmo;
      }
    }

    // Stamina
    let stamina = s.stamina;
    let staminaExhausted = s.staminaExhausted;
    if (staminaExhausted) {
      stamina = Math.min(STAMINA_MAX, stamina + (STAMINA_REGEN * dt) / 16);
      if (Date.now() - staminaExhaustedTimeRef.current >= STAMINA_RECOVER_DELAY) staminaExhausted = false;
    } else {
      stamina = Math.min(STAMINA_MAX, stamina + (STAMINA_REGEN * dt) / 16);
    }

    // Zombie movement + player damage + burn
    let playerHp = s.playerHp;
    let lastDamageTime = s.lastDamageTime;
    const recentKills: RecentKill[] = s.recentKills.filter(k => ts - k.time < 1000);

    const newZombies: Zombie[] = s.zombies.map(z => {
      if (z.isDead) return z;

      // Burn damage
      let hp = z.hp;
      if (z.burnUntil && ts < z.burnUntil) {
        hp = z.hp - (BURN_DPS * dt) / 1000;
        if (hp <= 0) {
          return { ...z, hp: 0, isDead: true, deathTime: ts };
        }
      }

      const dx = s.player.x - z.x;
      const dy = s.player.y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLAYER_RADIUS + ZOMBIE_RADIUS) {
        const dmg = (cfg.zombieDamage * dt) / 1000;
        playerHp -= dmg;
        lastDamageTime = ts;
        return { ...z, hp };
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const wander = 0.08;
      const wx = Math.sin(ts * 0.001 + z.walkPhase) * wander;
      const wy = Math.cos(ts * 0.0013 + z.walkPhase) * wander;
      return {
        ...z,
        hp,
        x: z.x + (nx + wx) * z.speed * (dt / 16),
        y: z.y + (ny + wy) * z.speed * (dt / 16),
        walkPhase: z.walkPhase + 0.05,
      };
    });

    if (playerHp <= 0) {
      stateRef.current = { ...s, playerHp: 0, gameOver: true };
      onStateChange({ ...stateRef.current });
      onGameEnd(false, s.kills, 0, s.score);
      return;
    }

    // Bullet movement + hit detection
    let kills = s.kills;
    let score = s.score;
    let killStreakBonus = s.killStreakBonus;
    const explosions = [...s.explosions.filter(e => ts - e.createdAt < 500)];
    const updatedZombies = [...newZombies];
    const survivingBullets: Bullet[] = [];

    const processKill = (zj: Zombie, j: number) => {
      if (updatedZombies[j].isDead) return;
      kills++;
      score += zj.isSprinter ? 15 : 10;
      recentKills.push({ id: zj.id, x: zj.x, y: zj.y, time: ts });
      updatedZombies[j] = { ...zj, hp: 0, isDead: true, deathTime: ts };
      const bonus = recordKill(ts);
      killStreakBonus += bonus;
    };

    const applyBurn = (zj: Zombie, j: number) => {
      if (updatedZombies[j].isDead) return;
      updatedZombies[j] = {
        ...updatedZombies[j],
        burnUntil: ts + BURN_DURATION,
      };
    };

    for (const b of s.bullets) {
      const nx = b.x + b.vx * (dt / 16);
      const ny = b.y + b.vy * (dt / 16);
      const nd = b.distanceTraveled + Math.sqrt(b.vx * b.vx + b.vy * b.vy) * (dt / 16);
      const expRadius = b.explosionRadius ?? DEFAULT_EXPLOSION_RADIUS;

      if (nd > b.range || nx < -80 || nx > GAME_W + 80 || ny < -80 || ny > GAME_H + 80) {
        if (b.isExplosive) {
          explosions.push({ id: idGen(), x: nx, y: ny, createdAt: ts, radius: expRadius });
          updatedZombies.forEach((z, i) => {
            if (z.isDead) return;
            const ddx = z.x - nx; const ddy = z.y - ny;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < expRadius) {
              const nhp = z.hp - b.damage;
              if (nhp <= 0) processKill(z, i);
              else updatedZombies[i] = { ...z, hp: nhp };
            }
          });
        }
        continue;
      }

      let hit = false;
      for (let i = 0; i < updatedZombies.length; i++) {
        const z = updatedZombies[i];
        if (z.isDead) continue;
        const ddx = z.x - nx; const ddy = z.y - ny;
        const isFlame = WEAPONS[b.weaponId]?.isFlame;
        const hitRadius = isFlame ? ZOMBIE_RADIUS + 8 : ZOMBIE_RADIUS + BULLET_RADIUS;

        if (Math.sqrt(ddx * ddx + ddy * ddy) < hitRadius) {
          if (b.isExplosive) {
            explosions.push({ id: idGen(), x: nx, y: ny, createdAt: ts, radius: expRadius });
            updatedZombies.forEach((zj, j) => {
              if (zj.isDead) return;
              const ex = zj.x - nx; const ey = zj.y - ny;
              if (Math.sqrt(ex * ex + ey * ey) < expRadius) {
                const nhp = zj.hp - b.damage;
                if (nhp <= 0) processKill(zj, j);
                else updatedZombies[j] = { ...zj, hp: nhp };
              }
            });
            hit = true; break;
          } else {
            const nhp = z.hp - b.damage;
            if (isFlame) {
              applyBurn(z, i);
            }
            if (nhp <= 0) processKill(z, i);
            else updatedZombies[i] = { ...z, hp: nhp };
            // Flame bullets pierce (don't set hit = true), others stop
            if (!isFlame) { hit = true; break; }
          }
        }
      }
      if (!hit) survivingBullets.push({ ...b, x: nx, y: ny, distanceTraveled: nd });
    }

    // Clean dead zombies after display time
    const finalZombies = updatedZombies.filter(z => !z.isDead || (z.deathTime && ts - z.deathTime < 700));

    // Count burn-killed zombies
    finalZombies.forEach((z, i) => {
      if (z.isDead && z.deathTime && ts - z.deathTime < 20) {
        const existing = recentKills.find(r => r.id === z.id);
        if (!existing) {
          kills++;
          score += z.isSprinter ? 15 : 10;
          recentKills.push({ id: z.id, x: z.x, y: z.y, time: ts });
          const bonus = recordKill(ts);
          killStreakBonus += bonus;
        }
      }
    });

    const aliveZombies = finalZombies.filter(z => !z.isDead).length;

    // Auto-aim
    let autoAngle = s.player.angle;
    let nearestDist = Infinity;
    for (const z of finalZombies) {
      if (z.isDead) continue;
      const dx = z.x - s.player.x; const dy = z.y - s.player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; autoAngle = Math.atan2(dy, dx); }
    }

    stateRef.current = {
      ...s, playerHp, stamina, staminaExhausted,
      bullets: survivingBullets, zombies: finalZombies, explosions,
      kills, score, killStreakBonus, isReloading, reloadProgress, ammo,
      zombiesRemainingInWave: aliveZombies,
      player: { ...s.player, angle: autoAngle },
      lastDamageTime, recentKills,
    };
    onStateChange({ ...stateRef.current });
    rafRef.current = requestAnimationFrame(tick);
  }, [onStateChange, onGameEnd, recordKill, onHorde]);

  function buildBullets(
    weapon: WeaponId,
    muzzleX: number, muzzleY: number,
    nx: number, ny: number,
    speed: number
  ): Bullet[] {
    const w = WEAPONS[weapon];
    return Array.from({ length: w.bulletsPerShot }, () => {
      const spread = (w.spread * (Math.random() - 0.5) * Math.PI) / 180;
      const c = Math.cos(spread); const ss = Math.sin(spread);
      const isExplosive = weapon === "bazooka" || weapon === "grenadelauncher";
      const bSpeed = weapon === "lasergun" ? speed * 3 : speed;
      return {
        id: idGen(), x: muzzleX, y: muzzleY,
        vx: (nx * c - ny * ss) * bSpeed, vy: (nx * ss + ny * c) * bSpeed,
        damage: w.damage, range: w.range, distanceTraveled: 0,
        weaponId: weapon, isExplosive,
        explosionRadius: w.explosionRadius,
      };
    });
  }

  useImperativeHandle(ref, () => ({
    getState: () => stateRef.current!,
    shootAtNearest: () => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.victory || isReloadingRef.current || s.ammo <= 0) return;
      const now = Date.now();
      const weapon = WEAPONS[s.currentWeapon];
      if (now - lastFireRef.current < weapon.fireRate) return;
      lastFireRef.current = now;

      let tx = s.player.x + Math.cos(s.player.angle) * 200;
      let ty = s.player.y + Math.sin(s.player.angle) * 200;
      let nearestDist = Infinity;
      for (const z of s.zombies) {
        if (z.isDead) continue;
        const dx = z.x - s.player.x; const dy = z.y - s.player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) { nearestDist = d; tx = z.x; ty = z.y; }
      }
      const dx = tx - s.player.x; const dy = ty - s.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist; const ny = dy / dist;
      const angle = Math.atan2(dy, dx);
      const muzzleX = s.player.x + Math.cos(angle) * 22;
      const muzzleY = s.player.y + Math.sin(angle) * 22;
      const newBullets = buildBullets(s.currentWeapon, muzzleX, muzzleY, nx, ny, 9);
      stateRef.current = {
        ...s, bullets: [...s.bullets, ...newBullets], ammo: s.ammo - 1,
        player: { ...s.player, angle },
        lastShotTime: now, lastShotAngle: angle,
        lastShotX: muzzleX, lastShotY: muzzleY,
      };
    },
    shoot: (targetX: number, targetY: number) => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.victory || isReloadingRef.current || s.ammo <= 0) return;
      const now = Date.now();
      const weapon = WEAPONS[s.currentWeapon];
      if (now - lastFireRef.current < weapon.fireRate) return;
      lastFireRef.current = now;
      const dx = targetX - s.player.x; const dy = targetY - s.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist; const ny = dy / dist;
      const angle = Math.atan2(dy, dx);
      const muzzleX = s.player.x + Math.cos(angle) * 22;
      const muzzleY = s.player.y + Math.sin(angle) * 22;
      const newBullets = buildBullets(s.currentWeapon, muzzleX, muzzleY, nx, ny, 9);
      stateRef.current = {
        ...s, bullets: [...s.bullets, ...newBullets], ammo: s.ammo - 1,
        player: { ...s.player, angle },
        lastShotTime: now, lastShotAngle: angle,
        lastShotX: muzzleX, lastShotY: muzzleY,
      };
    },
    movePlayer: (dx: number, dy: number, sprinting: boolean) => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.victory) return;
      let { stamina, staminaExhausted } = s;
      const isSprinting = sprinting && !staminaExhausted && stamina > 0;
      const speed = isSprinting ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;
      if (isSprinting) {
        stamina = Math.max(0, stamina - STAMINA_DRAIN);
        if (stamina <= 0) { staminaExhausted = true; staminaExhaustedTimeRef.current = Date.now(); }
      }
      stateRef.current = {
        ...s,
        player: {
          ...s.player,
          x: Math.max(PLAYER_RADIUS, Math.min(GAME_W - PLAYER_RADIUS, s.player.x + dx * speed)),
          y: Math.max(PLAYER_RADIUS, Math.min(GAME_H - PLAYER_RADIUS, s.player.y + dy * speed)),
        },
        stamina, staminaExhausted,
      };
    },
    reload: () => {
      const s = stateRef.current;
      if (!s || isReloadingRef.current || s.ammo === s.maxAmmo) return;
      isReloadingRef.current = true;
      reloadStartRef.current = Date.now();
      stateRef.current = { ...s, isReloading: true, reloadProgress: 0 };
    },
    setWeapon: (weaponId: WeaponId) => {
      const s = stateRef.current;
      if (!s) return;
      const weapon = WEAPONS[weaponId];
      stateRef.current = {
        ...s, currentWeapon: weaponId,
        ammo: weapon.ammoCapacity, maxAmmo: weapon.ammoCapacity,
        isReloading: false, reloadProgress: 0,
      };
      isReloadingRef.current = false;
    },
    startGame: (level: number, weapon: WeaponId, endless = false) => {
      stateRef.current = initState(level, weapon, endless);
      pausedRef.current = false;
      lastTimeRef.current = 0;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    },
    pauseGame: () => { pausedRef.current = true; },
    resumeGame: () => { pausedRef.current = false; },
  }));

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, []);
  return null;
});
