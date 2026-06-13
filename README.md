# CRYSTAL NEXUS

Next-generation 3D puzzle adventure — a living crystal universe built with Babylon.js, TypeScript, and NestJS.

## Architecture

```
crystal-nexus/
├── client/          # Babylon.js game (Vite + Capacitor)
├── server/          # NestJS API + Socket.IO multiplayer
└── packages/shared/ # Shared types, constants, game definitions
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, Babylon.js, WebGL, Capacitor |
| Backend | Node.js, NestJS, MongoDB, Redis, Socket.IO |
| Infra | AWS-ready, Firebase Auth/Analytics/FCM |

### Feature Modules (client)

| Module | Status |
|--------|--------|
| Match-3 engine | ✅ Playable with cascades & combos |
| 3D crystal rendering | ✅ Glow, particles, powered visuals |
| Powered crystals | ✅ Match-4 line, Match-5 nova |
| Crystal abilities | ✅ Tap powered crystals to activate |
| Fusion system | ✅ Fire+Storm, Nature+Ice, and more |
| Boss battles | ✅ Every 25 levels with HP bar & attacks |
| Gravity system | ✅ Multi-direction support |
| HUD / UI overlay | ✅ Score, moves, combos, boss bar |
| Kingdom / Guild / Pets | 📋 Scaffolded |
| Multiplayer | ✅ Socket.IO gateway |
| LiveOps / AI levels | 📋 Planned |

## Quick Start

```bash
# Install dependencies
npm install

# Build shared package
npm run build -w packages/shared

# Run game client (http://localhost:5173)
npm run dev

# Run API server (http://localhost:3000)
npm run dev:server

# Run both
npm run dev:all
```

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas) for server persistence

## Mobile Deployment

```bash
cd client
npm run build
npx cap add android   # or ios
npx cap sync
npm run cap:android   # opens Android Studio
```

## Gameplay

1. Tap a crystal to select it, then tap an adjacent one to swap
2. Match 3+ of the same energy crystal
3. **Match 4** creates a line-clearing powered crystal
4. **Match 5** creates a nova blast crystal
5. **Tap a powered crystal** to activate its ability
6. **Fuse crystals** by swapping adjacent pairs: Fire+Storm, Nature+Ice, Quantum+Void, Dragon+Celestial
7. **Boss levels** (25, 50, 75…) — deal damage with matches to defeat the boss before moves run out

Try a boss fight: `http://localhost:5173/?level=25`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/players/:uid` | Get player profile |
| POST | `/api/players` | Create player |
| GET | `/api/game/progress/:playerId` | Level progress |
| POST | `/api/game/progress` | Save level progress |

## Socket Events

Connect to `ws://localhost:3000/multiplayer`

- `match:join` — Join a puzzle duel
- `match:move` — Send score update
- `match:state` — Receive match state
- `match:leave` — Leave match

## License

Proprietary — All rights reserved.
