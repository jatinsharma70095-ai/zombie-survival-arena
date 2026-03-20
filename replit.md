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
- 10 levels, each 5% tougher (more zombies, more HP, faster)
- 6 weapons: Pistol (free), Shotgun, Sniper, Uzi, Minigun, Bazooka
- Stamina system: limited sprint with 10-second recovery after exhaustion
- Diamond currency: earned by completing levels, purchasable in shop
- Real-time game engine using requestAnimationFrame
- AsyncStorage for persistent player progress

### Screens
- `app/index.tsx` — Home screen with stats, PLAY, Arsenal, Shop
- `app/level-select.tsx` — Level selection grid (10 levels)
- `app/game.tsx` — Full game screen with HUD, joystick, shoot button
- `app/arsenal.tsx` — Weapon unlock/select screen
- `app/shop.tsx` — Diamond shop (6 packages + daily free reward)

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
