import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type WeaponId =
  | "pistol"
  | "shotgun"
  | "sniper"
  | "uzi"
  | "minigun"
  | "bazooka";

export interface Weapon {
  id: WeaponId;
  name: string;
  damage: number;
  fireRate: number;
  ammoCapacity: number;
  range: number;
  unlockCost: number;
  description: string;
  bulletColor: string;
  spread: number;
  bulletsPerShot: number;
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    damage: 25,
    fireRate: 400,
    ammoCapacity: 60,
    range: 260,
    unlockCost: 0,
    description: "Reliable sidearm. Always available.",
    bulletColor: "#FFD60A",
    spread: 0,
    bulletsPerShot: 1,
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    damage: 60,
    fireRate: 900,
    ammoCapacity: 30,
    range: 180,
    unlockCost: 80,
    description: "Devastating at close range. Fires spread pellets.",
    bulletColor: "#FF9F0A",
    spread: 30,
    bulletsPerShot: 5,
  },
  sniper: {
    id: "sniper",
    name: "Sniper",
    damage: 150,
    fireRate: 1500,
    ammoCapacity: 25,
    range: 500,
    unlockCost: 150,
    description: "One-shot kills from extreme range.",
    bulletColor: "#30D158",
    spread: 0,
    bulletsPerShot: 1,
  },
  uzi: {
    id: "uzi",
    name: "Uzi",
    damage: 15,
    fireRate: 100,
    ammoCapacity: 120,
    range: 200,
    unlockCost: 200,
    description: "High fire rate submachine gun.",
    bulletColor: "#007AFF",
    spread: 10,
    bulletsPerShot: 1,
  },
  minigun: {
    id: "minigun",
    name: "Minigun",
    damage: 18,
    fireRate: 60,
    ammoCapacity: 400,
    range: 220,
    unlockCost: 400,
    description: "Insane fire rate. Mow down hordes.",
    bulletColor: "#FF375F",
    spread: 15,
    bulletsPerShot: 1,
  },
  bazooka: {
    id: "bazooka",
    name: "Bazooka",
    damage: 200,
    fireRate: 2500,
    ammoCapacity: 18,
    range: 350,
    unlockCost: 600,
    description: "Explosive splash damage. Kills groups.",
    bulletColor: "#FF6B35",
    spread: 0,
    bulletsPerShot: 1,
  },
};

export interface PlayerStats {
  diamonds: number;
  currentLevel: number;
  maxLevelReached: number;
  unlockedWeapons: WeaponId[];
  selectedWeapon: WeaponId;
  totalKills: number;
  gamesPlayed: number;
}

export interface GameContextValue {
  playerStats: PlayerStats;
  addDiamonds: (amount: number) => void;
  spendDiamonds: (amount: number) => boolean;
  unlockWeapon: (weaponId: WeaponId) => boolean;
  selectWeapon: (weaponId: WeaponId) => void;
  completeLevel: (level: number, kills: number) => void;
  isLoaded: boolean;
}

const DEFAULT_STATS: PlayerStats = {
  diamonds: 50,
  currentLevel: 1,
  maxLevelReached: 1,
  unlockedWeapons: ["pistol"],
  selectedWeapon: "pistol",
  totalKills: 0,
  gamesPlayed: 0,
};

const STORAGE_KEY = "zombie_game_stats";

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerStats, setPlayerStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as PlayerStats;
          setPlayerStats({ ...DEFAULT_STATS, ...parsed });
        } catch {}
      }
      setIsLoaded(true);
    });
  }, []);

  const saveStats = useCallback((stats: PlayerStats) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }, 300);
  }, []);

  const updateStats = useCallback(
    (updater: (prev: PlayerStats) => PlayerStats) => {
      setPlayerStats((prev) => {
        const next = updater(prev);
        saveStats(next);
        return next;
      });
    },
    [saveStats]
  );

  const addDiamonds = useCallback(
    (amount: number) => {
      updateStats((prev) => ({ ...prev, diamonds: prev.diamonds + amount }));
    },
    [updateStats]
  );

  const spendDiamonds = useCallback(
    (amount: number): boolean => {
      let success = false;
      updateStats((prev) => {
        if (prev.diamonds >= amount) {
          success = true;
          return { ...prev, diamonds: prev.diamonds - amount };
        }
        return prev;
      });
      return success;
    },
    [updateStats]
  );

  const unlockWeapon = useCallback(
    (weaponId: WeaponId): boolean => {
      const weapon = WEAPONS[weaponId];
      let success = false;
      updateStats((prev) => {
        if (
          prev.unlockedWeapons.includes(weaponId) ||
          prev.diamonds < weapon.unlockCost
        ) {
          return prev;
        }
        success = true;
        return {
          ...prev,
          diamonds: prev.diamonds - weapon.unlockCost,
          unlockedWeapons: [...prev.unlockedWeapons, weaponId],
        };
      });
      return success;
    },
    [updateStats]
  );

  const selectWeapon = useCallback(
    (weaponId: WeaponId) => {
      updateStats((prev) => {
        if (!prev.unlockedWeapons.includes(weaponId)) return prev;
        return { ...prev, selectedWeapon: weaponId };
      });
    },
    [updateStats]
  );

  const completeLevel = useCallback(
    (level: number, kills: number) => {
      const diamondReward = 10 + level * 2;
      updateStats((prev) => ({
        ...prev,
        diamonds: prev.diamonds + diamondReward,
        currentLevel: Math.min(level + 1, 10),
        maxLevelReached: Math.max(prev.maxLevelReached, level + 1),
        totalKills: prev.totalKills + kills,
        gamesPlayed: prev.gamesPlayed + 1,
      }));
    },
    [updateStats]
  );

  const value = useMemo<GameContextValue>(
    () => ({
      playerStats,
      addDiamonds,
      spendDiamonds,
      unlockWeapon,
      selectWeapon,
      completeLevel,
      isLoaded,
    }),
    [
      playerStats,
      addDiamonds,
      spendDiamonds,
      unlockWeapon,
      selectWeapon,
      completeLevel,
      isLoaded,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
