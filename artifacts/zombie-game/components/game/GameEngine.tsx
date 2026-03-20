import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Dimensions, Platform } from "react-native";
import { WeaponId, WEAPONS, Weapon } from "@/context/GameContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export const GAME_W = SCREEN_W;
export const GAME_H = SCREEN_H;

const PLAYER_RADIUS = 16;
const ZOMBIE_RADIUS = 14;
const BULLET_RADIUS = 5;
const EXPLOSION_RADIUS = 80;
const PLAYER_SPEED = 3.5;
const ZOMBIE_BASE_SPEED = 0.9;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 1.5;
const STAMINA_REGEN = 1.2;
const STAMINA_RECOVER_DELAY = 10000;

export interface Position {
  x: number;
  y: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  range: number;
  distanceTraveled: number;
  weaponId: WeaponId;
  isExplosive: boolean;
}

export interface Zombie {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  isDead: boolean;
  deathTime?: number;
}

export interface Explosion {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  radius: number;
}

export interface GameState {
  player: Position & { angle: number };
  playerHp: number;
  maxHp: number;
  stamina: number;
  bullets: Bullet[];
  zombies: Zombie[];
  explosions: Explosion[];
  score: number;
  kills: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  currentWeapon: WeaponId;
  level: number;
  wave: number;
  zombiesRemainingInWave: number;
  gameOver: boolean;
  victory: boolean;
  staminaExhausted: boolean;
}

export interface GameEngineHandle {
  getState: () => GameState;
  shoot: (targetX: number, targetY: number) => void;
  shootAtNearest: () => void;
  movePlayer: (dx: number, dy: number, sprinting: boolean) => void;
  reload: () => void;
  setWeapon: (weaponId: WeaponId) => void;
  startGame: (level: number, weapon: WeaponId) => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

function getLevelConfig(level: number) {
  const toughMult = 1 + (level - 1) * 0.05;
  const waveSizes = [
    Math.floor(4 * toughMult),
    Math.floor(7 * toughMult),
    Math.floor(10 * toughMult),
  ];
  return {
    toughMult,
    waveSizes,
    totalWaves: 3,
    zombieHp: Math.floor(50 * toughMult),
    zombieSpeed: ZOMBIE_BASE_SPEED * (1 + (level - 1) * 0.04),
    zombieDamage: Math.floor(8 * toughMult),
  };
}

function spawnZombiesAroundEdge(count: number, config: ReturnType<typeof getLevelConfig>): Zombie[] {
  const zs: Zombie[] = [];
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (side === 0) { x = Math.random() * GAME_W; y = -40; }
    else if (side === 1) { x = GAME_W + 40; y = Math.random() * GAME_H; }
    else if (side === 2) { x = Math.random() * GAME_W; y = GAME_H + 40; }
    else { x = -40; y = Math.random() * GAME_H; }
    zs.push({
      id: `z-${Date.now()}-${i}-${Math.random()}`,
      x, y,
      hp: config.zombieHp,
      maxHp: config.zombieHp,
      speed: config.zombieSpeed + (Math.random() - 0.5) * 0.3,
      isDead: false,
    });
  }
  return zs;
}

function idGen() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const GameEngine = React.forwardRef<
  GameEngineHandle,
  { onStateChange: (state: GameState) => void; onGameEnd: (won: boolean, kills: number) => void }
>(({ onStateChange, onGameEnd }, ref) => {
  const stateRef = useRef<GameState | null>(null);
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const lastFireRef = useRef<number>(0);
  const staminaExhaustedTimeRef = useRef<number>(0);
  const isReloadingRef = useRef(false);
  const reloadStartRef = useRef<number>(0);
  const waveSpawnTimerRef = useRef<number>(0);
  const configRef = useRef(getLevelConfig(1));

  const initState = useCallback((level: number, weapon: WeaponId): GameState => {
    const cfg = getLevelConfig(level);
    configRef.current = cfg;
    const w = WEAPONS[weapon];
    return {
      player: { x: GAME_W / 2, y: GAME_H / 2, angle: 0 },
      playerHp: 100,
      maxHp: 100,
      stamina: STAMINA_MAX,
      bullets: [],
      zombies: [],
      explosions: [],
      score: 0,
      kills: 0,
      ammo: w.ammoCapacity,
      maxAmmo: w.ammoCapacity,
      isReloading: false,
      reloadProgress: 0,
      currentWeapon: weapon,
      level,
      wave: 0,
      zombiesRemainingInWave: 0,
      gameOver: false,
      victory: false,
      staminaExhausted: false,
    };
  }, []);

  const tick = useCallback((timestamp: number) => {
    if (pausedRef.current || !stateRef.current) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16;
    lastTimeRef.current = timestamp;

    const s = stateRef.current;
    if (s.gameOver || s.victory) return;

    const cfg = configRef.current;
    const weapon = WEAPONS[s.currentWeapon];

    // Spawn next wave
    if (s.zombiesRemainingInWave === 0 && s.zombies.filter(z => !z.isDead).length === 0) {
      const nextWave = s.wave + 1;
      if (nextWave > cfg.totalWaves) {
        stateRef.current = { ...s, victory: true };
        onStateChange({ ...stateRef.current });
        onGameEnd(true, s.kills);
        return;
      }
      const waveSize = cfg.waveSizes[nextWave - 1] ?? cfg.waveSizes[cfg.waveSizes.length - 1];
      const newZombies = spawnZombiesAroundEdge(waveSize, cfg);
      stateRef.current = {
        ...s,
        wave: nextWave,
        zombiesRemainingInWave: waveSize,
        zombies: newZombies,
      };
      onStateChange({ ...stateRef.current });
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    // Reload progress
    let { isReloading, reloadProgress, ammo, maxAmmo } = s;
    const RELOAD_TIME = 1500;
    if (isReloading) {
      const elapsed = timestamp - reloadStartRef.current;
      reloadProgress = Math.min(elapsed / RELOAD_TIME, 1);
      if (reloadProgress >= 1) {
        isReloading = false;
        isReloadingRef.current = false;
        reloadProgress = 0;
        ammo = maxAmmo;
      }
    }

    // Stamina
    let stamina = s.stamina;
    let staminaExhausted = s.staminaExhausted;
    const nowMs = Date.now();
    if (staminaExhausted) {
      stamina = Math.min(STAMINA_MAX, stamina + (STAMINA_REGEN * dt) / 16);
      if (nowMs - staminaExhaustedTimeRef.current >= STAMINA_RECOVER_DELAY) {
        staminaExhausted = false;
      }
    } else {
      stamina = Math.min(STAMINA_MAX, stamina + (STAMINA_REGEN * dt) / 16);
    }

    // Move zombies toward player, check hits
    let playerHp = s.playerHp;
    const newZombies: Zombie[] = s.zombies.map((z) => {
      if (z.isDead) return z;
      const dx = s.player.x - z.x;
      const dy = s.player.y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLAYER_RADIUS + ZOMBIE_RADIUS) {
        playerHp -= (cfg.zombieDamage * dt) / 1000;
        return z;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      return { ...z, x: z.x + nx * z.speed * (dt / 16), y: z.y + ny * z.speed * (dt / 16) };
    });

    if (playerHp <= 0) {
      stateRef.current = { ...s, playerHp: 0, gameOver: true };
      onStateChange({ ...stateRef.current });
      onGameEnd(false, s.kills);
      return;
    }

    // Move bullets
    let kills = s.kills;
    let score = s.score;
    const explosions: Explosion[] = [...s.explosions.filter(e => timestamp - e.createdAt < 400)];
    const updatedZombies = [...newZombies];

    const survivingBullets: Bullet[] = [];
    for (const b of s.bullets) {
      const nx = b.x + b.vx * (dt / 16);
      const ny = b.y + b.vy * (dt / 16);
      const newDist = b.distanceTraveled + Math.sqrt(b.vx * b.vx + b.vy * b.vy) * (dt / 16);

      if (newDist > b.range || nx < -50 || nx > GAME_W + 50 || ny < -50 || ny > GAME_H + 50) {
        if (b.isExplosive) {
          explosions.push({ id: idGen(), x: nx, y: ny, createdAt: timestamp, radius: EXPLOSION_RADIUS });
          for (let i = 0; i < updatedZombies.length; i++) {
            const z = updatedZombies[i];
            if (z.isDead) continue;
            const ddx = z.x - nx;
            const ddy = z.y - ny;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < EXPLOSION_RADIUS) {
              const newHp = z.hp - b.damage;
              if (newHp <= 0) { kills++; score += 10; updatedZombies[i] = { ...z, hp: 0, isDead: true, deathTime: timestamp }; }
              else updatedZombies[i] = { ...z, hp: newHp };
            }
          }
        }
        continue;
      }

      let hit = false;
      for (let i = 0; i < updatedZombies.length; i++) {
        const z = updatedZombies[i];
        if (z.isDead) continue;
        const ddx = z.x - nx;
        const ddy = z.y - ny;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < ZOMBIE_RADIUS + BULLET_RADIUS) {
          if (b.isExplosive) {
            explosions.push({ id: idGen(), x: nx, y: ny, createdAt: timestamp, radius: EXPLOSION_RADIUS });
            for (let j = 0; j < updatedZombies.length; j++) {
              const zj = updatedZombies[j];
              if (zj.isDead) continue;
              const eddx = zj.x - nx;
              const eddy = zj.y - ny;
              if (Math.sqrt(eddx * eddx + eddy * eddy) < EXPLOSION_RADIUS) {
                const newHp = zj.hp - b.damage;
                if (newHp <= 0) { kills++; score += 10; updatedZombies[j] = { ...zj, hp: 0, isDead: true, deathTime: timestamp }; }
                else updatedZombies[j] = { ...zj, hp: newHp };
              }
            }
          } else {
            const newHp = z.hp - b.damage;
            if (newHp <= 0) { kills++; score += 10; updatedZombies[i] = { ...z, hp: 0, isDead: true, deathTime: timestamp }; }
            else updatedZombies[i] = { ...z, hp: newHp };
          }
          hit = true;
          break;
        }
      }

      if (!hit) {
        survivingBullets.push({ ...b, x: nx, y: ny, distanceTraveled: newDist });
      }
    }

    // Clean up dead zombies after 600ms
    const finalZombies = updatedZombies.filter(z => !z.isDead || (z.deathTime && timestamp - z.deathTime < 600));
    const aliveZombies = finalZombies.filter(z => !z.isDead).length;

    // ── AUTO-AIM: rotate player toward nearest alive zombie ──
    let autoAngle = s.player.angle;
    let nearestDist = Infinity;
    for (const z of finalZombies) {
      if (z.isDead) continue;
      const dx = z.x - s.player.x;
      const dy = z.y - s.player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) {
        nearestDist = d;
        autoAngle = Math.atan2(dy, dx);
      }
    }

    stateRef.current = {
      ...s,
      playerHp,
      stamina,
      staminaExhausted,
      bullets: survivingBullets,
      zombies: finalZombies,
      explosions,
      kills,
      score,
      isReloading,
      reloadProgress,
      ammo,
      zombiesRemainingInWave: aliveZombies,
      player: { ...s.player, angle: autoAngle },
    };

    onStateChange({ ...stateRef.current });
    animFrameRef.current = requestAnimationFrame(tick);
  }, [onStateChange, onGameEnd]);

  useImperativeHandle(ref, () => ({
    getState: () => stateRef.current!,
    shootAtNearest: () => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.victory || isReloadingRef.current) return;
      // Find nearest alive zombie
      let nearestX = s.player.x + Math.cos(s.player.angle) * 200;
      let nearestY = s.player.y + Math.sin(s.player.angle) * 200;
      let nearestDist = Infinity;
      for (const z of s.zombies) {
        if (z.isDead) continue;
        const dx = z.x - s.player.x;
        const dy = z.y - s.player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) {
          nearestDist = d;
          nearestX = z.x;
          nearestY = z.y;
        }
      }
      const now = Date.now();
      const weapon = WEAPONS[s.currentWeapon];
      if (now - lastFireRef.current < weapon.fireRate) return;
      if (s.ammo <= 0) return;
      lastFireRef.current = now;
      const dx = nearestX - s.player.x;
      const dy = nearestY - s.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = 9;
      const newBullets: Bullet[] = [];
      for (let i = 0; i < weapon.bulletsPerShot; i++) {
        const spread = (weapon.spread * (Math.random() - 0.5) * Math.PI) / 180;
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        const vx = (nx * cos - ny * sin) * speed;
        const vy = (nx * sin + ny * cos) * speed;
        newBullets.push({
          id: idGen(), x: s.player.x, y: s.player.y,
          vx, vy, damage: weapon.damage,
          range: weapon.range, distanceTraveled: 0,
          weaponId: s.currentWeapon,
          isExplosive: s.currentWeapon === "bazooka",
        });
      }
      stateRef.current = {
        ...s,
        bullets: [...s.bullets, ...newBullets],
        ammo: s.ammo - 1,
        player: { ...s.player, angle: Math.atan2(dy, dx) },
      };
    },
    shoot: (targetX: number, targetY: number) => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.victory || isReloadingRef.current) return;
      const now = Date.now();
      const weapon = WEAPONS[s.currentWeapon];
      if (now - lastFireRef.current < weapon.fireRate) return;
      if (s.ammo <= 0) return;
      lastFireRef.current = now;
      const dx = targetX - s.player.x;
      const dy = targetY - s.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = 8;
      const newBullets: Bullet[] = [];
      for (let i = 0; i < weapon.bulletsPerShot; i++) {
        const spread = (weapon.spread * (Math.random() - 0.5) * Math.PI) / 180;
        const cos = Math.cos(spread);
        const sin = Math.sin(spread);
        const vx = (nx * cos - ny * sin) * speed;
        const vy = (nx * sin + ny * cos) * speed;
        newBullets.push({
          id: idGen(), x: s.player.x, y: s.player.y,
          vx, vy, damage: weapon.damage,
          range: weapon.range, distanceTraveled: 0,
          weaponId: s.currentWeapon,
          isExplosive: s.currentWeapon === "bazooka",
        });
      }
      const angle = Math.atan2(dy, dx);
      stateRef.current = {
        ...s,
        bullets: [...s.bullets, ...newBullets],
        ammo: s.ammo - 1,
        player: { ...s.player, angle },
      };
    },
    movePlayer: (dx: number, dy: number, sprinting: boolean) => {
      const s = stateRef.current;
      if (!s || s.gameOver || s.victory) return;
      let { stamina, staminaExhausted } = s;
      let isSprinting = sprinting && !staminaExhausted && stamina > 0;
      const speed = isSprinting ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;
      if (isSprinting) {
        stamina = Math.max(0, stamina - STAMINA_DRAIN);
        if (stamina <= 0) {
          staminaExhausted = true;
          staminaExhaustedTimeRef.current = Date.now();
        }
      }
      const newX = Math.max(PLAYER_RADIUS, Math.min(GAME_W - PLAYER_RADIUS, s.player.x + dx * speed));
      const newY = Math.max(PLAYER_RADIUS, Math.min(GAME_H - PLAYER_RADIUS, s.player.y + dy * speed));
      stateRef.current = {
        ...s,
        player: { ...s.player, x: newX, y: newY },
        stamina,
        staminaExhausted,
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
        ...s,
        currentWeapon: weaponId,
        ammo: weapon.ammoCapacity,
        maxAmmo: weapon.ammoCapacity,
        isReloading: false,
        reloadProgress: 0,
      };
      isReloadingRef.current = false;
    },
    startGame: (level: number, weapon: WeaponId) => {
      const state = initState(level, weapon);
      stateRef.current = state;
      pausedRef.current = false;
      lastTimeRef.current = 0;
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(tick);
    },
    pauseGame: () => { pausedRef.current = true; },
    resumeGame: () => { pausedRef.current = false; },
  }));

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return null;
});
