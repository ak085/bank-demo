# bank-demo — AI Building Intelligence Demo

Generic bank building demo. Three pages showing AI optimisation for VRV, Lighting, and BTU meters, framed around a fictional bank's branches (no real bank branding).

## Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| State | MobX 6 (`makeAutoObservable`) |
| UI components | Ant Design 5 |
| Charts | Apache ECharts 5 via `echarts-for-react` |
| Rendering | zrender (used internally by ECharts — SVG/Canvas hybrid) |
| Build | Webpack 5 |
| Server | nginx (static SPA) |

**Important:** This project intentionally uses Ant Design — it is a bank demo targeting integration into a prospective client's existing platform, which typically uses Ant Design for internal tooling. Do **not** replace Ant Design with Tremor or Next.js.

## Ports

| Service | Port |
|---|---|
| Frontend | 100.125.242.78:8029 |

## Pages

- `/` — Landing page: three tiles (VRV / Lighting / BTU Meters)
- `/vrv` — VRV outdoor units: power, COP, temps, AI recommendation
- `/lighting` — Zone lighting: dimming, lux, occupancy, savings
- `/btu` — BTU meters per bank branch: ΔT, flow, efficiency alerts

## Data

All data is **mock/simulated** — generated in MobX stores (`src/stores/`). Values update every 5 seconds via `setInterval`. No backend, no API, no real BMS connection.

To make data look realistic: stores generate history arrays at init time with a time-of-day load curve (sine envelope 08:00–20:00), then tick with Gaussian noise.

## Reference Skill

`skills/dashboard-demo-equipment/` — copied from `ak101/claude-skills` on Gitea. Use this as the reference design spec when adding new equipment types. The archetype YAML schema in `skills/dashboard-demo-equipment/archetypes/_README.md` describes the full data model.

## Syncthing

Drop client documents/screenshots/specs into `~/sync/bank-demo/inbox/`. Exports (screenshots, PDFs) go to `~/sync/bank-demo/exports/`.

## How to build & run

```bash
cd /home/ak101/bank-demo
docker compose up -d --build
```

Check logs:
```bash
docker logs bank-demo
```

## Development (live reload)

```bash
cd frontend
npm install --legacy-peer-deps
npm start   # webpack-dev-server on :3000
```

## Adding a new equipment page

1. Create `src/stores/NewStore.ts` — extend `RootStore` in `src/stores/index.ts`
2. Create `src/pages/NewPage.tsx` — follow VRVPage pattern
3. Add tile in `LandingPage.tsx` and route in `App.tsx`
4. Refer to `skills/dashboard-demo-equipment/SKILL.md` for archetype design guidance
