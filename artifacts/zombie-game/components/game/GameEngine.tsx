import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Dimensions } from "react-native";
import { WeaponId, WEAPONS } from "@/context/GameContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
export const GAME_W = SCREEN_W;
export const GAME_H = SCREEN_H;

const PLAYER_RADIUS = 16;
const ZOMBIE_RADIUS = 14;
const BULLET_RADIUS = 5;
const EXPLOSION_RADIUS = 80;
const PLAYER_SPEED = 3.5;
const ZOMBIE_BASE_SPEED = 1.1;
const STAMINA_MAX = 100;
const STAMINA_DRAIN = 1.5;
const STAMINA_REGEN = 1.2;
const STAMINA_RECOVER_DELAY = 8000;

export interface Position { x: number; y: number; }

export interface Bullet {
  id: string; x: number; y: number;
  vx: number; vy: number; damage: number;
  range: number; distanceTraveled: number;
  weaponId: WeaponId; isExplosive: boolean;
}

export interface Zombie {
  id: string; x: number; y: number;
  hp: number; maxHp: number; speed: number;
  isDead: boolean; deathTime?: number;
  walkPhase: number;
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
}

export interface GameEngineHandle {
  getState: () => GameState;
  shoot: (tx: number, ty: number) => void;
  shootAtNearest: () => void;
  movePlayer: (dx: number, dy: number, sprinting: boolean) => void;
  reload: () => void;
  setWeapon: (weaponId: WeaponId) => void;
  startGame: (level: number, weapon: WeaponId) => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

function getLevelConfig(level: number) {
  const t = 1 + (level - 1) * 0.05;
  return {
    toughMult: t,
    waveSizes: [Math.floor(4 * t), Math.floor(7 * t), Math.floor(10 * t)],
    totalWaves: 3,
    zombieHp: Math.floor(50 * t),
    zombieSpeed: ZOMBIE_BASE_SPEED * (1 + (level - 1) * 0.06),
    zombieDamage: Math.floor(8 * t),
  };
}

function spawnZombies(count: number, cfg: ReturnType<typeof getLevelConfig>): Zombie[] {
  return Array.from({ length: count }, (_, i) => {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * GAME_W; y = -50; }
    else if (side === 1) { x = GAME_W + 50; y = Math.random() * GAME_H; }
    else if (side === 2) { x = Math.random() * GAME_W; y = GAME_H + 50; }
    else { x = -50; y = Math.random() * GAME_H; }
    return {
      id: `z-${Date.now()}-${i}-${Math.random()}`,
      x, y,
      hp: cfg.zombieHp, maxHp: cfg.zombieHp,
      speed: cfg.zombieSpeed + (Math.random() - 0.5) * 0.4,
      isDead: false, walkPhase: Math.random() * Math.PI * 2,
    };
  });
}

function idGen() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

export const GameEngine = React.forwardRef<
  GameEngineHandle,
  { onStateChange: (s: GameState) => void; onGameEnd: (won: boolean, kills: number) => void }
>(({ onStateChange, onGameEnd }, ref) => {
  const stateRef = useRef<GameState | null>(null);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const lastFireRef = useRef(0);
  const isReloadingRef = useRef(false);
  const reloadStartRef = useRef(0);
  const staminaExhaustedTimeRef = useRef(0);
  const configRef = useRef(getLevelConfig(1));

  const initState = useCallback((level: number, weapon: WeaponId): GameState => {
    const cfg = getLevelConfig(level);
    configRef.current = cfg;
    const w = WEAPONS[weapon];
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
    };
  }, []);

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

    // Wave spawn
    if (s.zombiesRemainingInWave === 0 && s.zombies.filter(z => !z.isDead).length === 0) {
      const nw = s.wave + 1;
      if (nw > cfg.totalWaves) {
        stateRef.current = { ...s, victory: true };
        onStateChange({ ...stateRef.current });
        onGameEnd(true, s.kills);
        return;
      }
      const sz = cfg.waveSizes[nw - 1] ?? cfg.waveSizes[cfg.waveSizes.length - 1];
      stateRef.current = { ...s, wave: nw, zombiesRemainingInWave: sz, zombies: spawnZombies(sz, cfg) };
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

    // Zombie movement + player damage
    let playerHp = s.playerHp;
    let lastDamageTime = s.lastDamageTime;
    const recentKills: RecentKill[] = s.recentKills.filter(k => ts - k.time < 1000);

    const newZombies: Zombie[] = s.zombies.map(z => {
      if (z.isDead) return z;
      const dx = s.player.x - z.x;
      const dy = s.player.y - z.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLAYER_RADIUS + ZOMBIE_RADIUS) {
        const dmg = (cfg.zombieDamage * dt) / 1000;
        playerHp -= dmg;
        lastDamageTime = ts;
        return z;
      }
      // Move toward player aggressively + slight wander
      const nx = dx / dist;
      const ny = dy / dist;
      const wander = 0.08;
      const wx = Math.sin(ts * 0.001 + z.walkPhase) * wander;
      const wy = Math.cos(ts * 0.0013 + z.walkPhase) * wander;
      return {
        ...z,
        x: z.x + (nx + wx) * z.speed * (dt / 16),
        y: z.y + (ny + wy) * z.speed * (dt / 16),
        walkPhase: z.walkPhase + 0.05,
      };
    });

    if (playerHp <= 0) {
      stateRef.current = { ...s, playerHp: 0, gameOver: true };
      onStateChange({ ...stateRef.current });
      onGameEnd(false, s.kills);
      return;
    }

    // Bullet movement
    let kills = s.kills;
    let score = s.score;
    const explosions = [...s.explosions.filter(e => ts - e.createdAt < 500)];
    const updatedZombies = [...newZombies];
    const survivingBullets: Bullet[] = [];

    for (const b of s.bullets) {
      const nx = b.x + b.vx * (dt / 16);
      const ny = b.y + b.vy * (dt / 16);
      const nd = b.distanceTraveled + Math.sqrt(b.vx * b.vx + b.vy * b.vy) * (dt / 16);

      if (nd > b.range || nx < -60 || nx > GAME_W + 60 || ny < -60 || ny > GAME_H + 60) {
        if (b.isExplosive) {
          explosions.push({ id: idGen(), x: nx, y: ny, createdAt: ts, radius: EXPLOSION_RADIUS });
          updatedZombies.forEach((z, i) => {
            if (z.isDead) return;
            const ddx = z.x - nx; const ddy = z.y - ny;
            if (Math.sqrt(ddx * ddx + ddy * ddy) < EXPLOSION_RADIUS) {
              const nhp = z.hp - b.damage;
              if (nhp <= 0) { kills++; score += 10; recentKills.push({ id: z.id, x: z.x, y: z.y, time: ts }); updatedZombies[i] = { ...z, hp: 0, isDead: true, deathTime: ts }; }
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
        if (Math.sqrt(ddx * ddx + ddy * ddy) < ZOMBIE_RADIUS + BULLET_RADIUS) {
          if (b.isExplosive) {
            explosions.push({ id: idGen(), x: nx, y: ny, createdAt: ts, radius: EXPLOSION_RADIUS });
            updatedZombies.forEach((zj, j) => {
              if (zj.isDead) return;
              const ex = zj.x - nx; const ey = zj.y - ny;
              if (Math.sqrt(ex * ex + ey * ey) < EXPLOSION_RADIUS) {
                const nhp = zj.hp - b.damage;
                if (nhp <= 0) { kills++; score += 10; recentKills.push({ id: zj.id, x: zj.x, y: zj.y, time: ts }); updatedZombies[j] = { ...zj, hp: 0, isDead: true, deathTime: ts }; }
                else updatedZombies[j] = { ...zj, hp: nhp };
              }
            });
          } else {
            const nhp = z.hp - b.damage;
            if (nhp <= 0) { kills++; score += 10; recentKills.push({ id: z.id, x: z.x, y: z.y, time: ts }); updatedZombies[i] = { ...z, hp: 0, isDead: true, deathTime: ts }; }
            else updatedZombies[i] = { ...z, hp: nhp };
          }
          hit = true; break;
        }
      }
      if (!hit) survivingBullets.push({ ...b, x: nx, y: ny, distanceTraveled: nd });
    }

    const finalZombies = updatedZombies.filter(z => !z.isDead || (z.deathTime && ts - z.deathTime < 700));
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
      kills, score, isReloading, reloadProgress, ammo,
      zombiesRemainingInWave: aliveZombies,
      player: { ...s.player, angle: autoAngle },
      lastDamageTime, recentKills,
    };
    onStateChange({ ...stateRef.current });
    rafRef.current = requestAnimationFrame(tick);
  }, [onStateChange, onGameEnd]);

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
      const speed = 9;
      const angle = Math.atan2(dy, dx);
      const muzzleX = s.player.x + Math.cos(angle) * 22;
      const muzzleY = s.player.y + Math.sin(angle) * 22;
      const newBullets: Bullet[] = Array.from({ length: weapon.bulletsPerShot }, () => {
        const spread = (weapon.spread * (Math.random() - 0.5) * Math.PI) / 180;
        const c = Math.cos(spread); const ss = Math.sin(spread);
        return {
          id: idGen(), x: muzzleX, y: muzzleY,
          vx: (nx * c - ny * ss) * speed, vy: (nx * ss + ny * c) * speed,
          damage: weapon.damage, range: weapon.range, distanceTraveled: 0,
          weaponId: s.currentWeapon, isExplosive: s.currentWeapon === "bazooka",
        };
      });
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
      const newBullets: Bullet[] = Array.from({ length: weapon.bulletsPerShot }, () => {
        const spread = (weapon.spread * (Math.random() - 0.5) * Math.PI) / 180;
        const c = Math.cos(spread); const ss = Math.sin(spread);
        return {
          id: idGen(), x: muzzleX, y: muzzleY,
          vx: (nx * c - ny * ss) * 8, vy: (nx * ss + ny * c) * 8,
          damage: weapon.damage, range: weapon.range, distanceTraveled: 0,
          weaponId: s.currentWeapon, isExplosive: s.currentWeapon === "bazooka",
        };
      });
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
    startGame: (level: number, weapon: WeaponId) => {
      stateRef.current = initState(level, weapon);
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
