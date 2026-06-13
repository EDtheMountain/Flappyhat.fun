# Flappy Wif Hat

A Flappy Bird–style browser game where players control a pixel-art WIF knitted beanie hat through pipes, collect $BTH coins, and compete on a global leaderboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port varies, set by workflow)
- `pnpm --filter @workspace/wifhat-game run dev` — run the frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `TWITTER_CONSUMER_KEY`, `TWITTER_CONSUMER_SECRET` — for Twitter/X OAuth sign-in
- Required env: `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter routing, Tailwind CSS, canvas game loop
- API: Express 5 + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Guest login (any username) + Twitter/X OAuth 1.0a (requires API keys)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (users.ts, scores.ts)
- `artifacts/api-server/src/routes/` — Express route handlers (auth.ts, scores.ts, health.ts)
- `artifacts/wifhat-game/src/pages/` — React pages (home.tsx, game.tsx, leaderboard.tsx)
- `attached_assets/Wifhat_1781355793327.png` — Player hat sprite (imported via `@assets` alias)

## Architecture decisions

- Game loop uses canvas + requestAnimationFrame (not DOM/CSS animation)
- Sessions stored in PostgreSQL via `connect-pg-simple` for persistence across restarts
- Twitter OAuth implemented manually (OAuth 1.0a) without Passport to avoid package size
- $BTH coins are dummy/in-game only: 1 coin per 300 points, tracked in the `users.bth_coins` column
- Difficulty scales every 10 pipe-passes (faster speed + narrower gap, capped at max values)

## Product

- Home screen: play as guest (username) or sign in with Twitter/X
- Game: flap through pipes, collect gold $BTH coins in pipe gaps, 3-2-1-GO countdown
- Game Over: shows score, $BTH earned, rank, high score badge
- Leaderboard: global top 50 by high score with $BTH coin totals

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Twitter OAuth requires `TWITTER_CONSUMER_KEY` and `TWITTER_CONSUMER_SECRET` env vars; without them, only guest login works
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml
- Run `pnpm --filter @workspace/db run push` after changing DB schema files
- The `@assets` alias in Vite points to `attached_assets/` at the workspace root

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
