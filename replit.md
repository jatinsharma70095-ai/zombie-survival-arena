# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── zombie-game/        # Expo mobile game (Zombie Survival)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Zombie Survival Game (`artifacts/zombie-game`)

Mobile action survival game built with Expo React Native.

### Features
- **50 levels** with unique names (Dead Quiet → The End), +8% difficulty per level
- **9 weapons**: Pistol (free) → Shotgun (150) → Sniper (300) → Uzi (500) → Minigun (800) → Bazooka (1200) → Flamethrower (1600) → Grenade Launcher (2200) → Laser Gun (3000)
- **Sprinting zombies** from level 5 (2.6x speed, orange eyes, 0.55x HP)
- **Horde events** at levels 10/20/30/40/50 — sudden burst of 14+ sprinters mid-wave
- **Endless mode** after level 50 — infinite waves with escalating difficulty, high score tracking
- **Red screen vignette** pulsing when HP < 30%
- **Animated fog**, screen shake on damage, blood splatter, muzzle flash
- **Kill streak system**: 5 kills in 8 seconds = +10 bonus diamonds with toast
- **Rewarded ad button** in shop (optional, +20 diamonds, 30s cooldown)
- **Per-device save** using unique device ID + AsyncStorage

### Special Weapon Behaviors
- Flamethrower: pierces enemies, applies 3-second burn (12 dps), orange flame visuals
- Grenade Launcher: explosive splash radius 130px, green grenade visual
- Laser Gun: 3x bullet speed, bright magenta beam trail, extreme range

### Screens
- `app/index.tsx` — Home screen with stats, PLAY, Arsenal, Shop, credits
- `app/level-select.tsx` — Level selection (50 levels + endless unlock)
- `app/game.tsx` — Full game screen; horde warning overlay, endless mode UI
- `app/arsenal.tsx` — Weapon unlock/select (9 weapons with stat bars)
- `app/shop.tsx` — Diamond shop (6 packages + daily free + rewarded ad)

### Game Components
- `components/game/GameEngine.tsx` — Core game loop (requestAnimationFrame), zombie AI, bullet physics
- `components/game/GameCanvas.tsx` — SVG rendering of player, zombies, bullets, explosions
- `components/game/Joystick.tsx` — Left joystick for movement (with sprint)
- `components/game/ShootButton.tsx` — Right pad for auto-fire + direction
- `components/game/HUD.tsx` — Health, stamina, ammo, wave info, diamonds
- `components/game/WeaponSelector.tsx` — In-game weapon switch bar

### State Management
- `context/GameContext.tsx` — Global player stats, diamond economy, weapon unlocks (AsyncStorage)

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes live in `src/routes/`.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval codegen config.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from the OpenAPI spec.
