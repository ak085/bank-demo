---
name: dashboard-demo-equipment
description: Add a new equipment type (chiller, boiler, VRF, lighting, meter, …) to the dashboard-demo by writing an archetype YAML and stamping the templates in this skill. Use whenever someone asks to extend the demo dashboard beyond the existing AHU archetype, or to spin up a customer-specific demo for a different building system.
---

# dashboard-demo-equipment

Turn one equipment type into a complete demo dashboard slice — points, KPIs, alarms, history, pages, i18n — by editing one YAML and stamping the templates beside it.

## When to invoke

- "Add chillers / boilers / VRFs / meters to the demo dashboard."
- "Build a dashboard-demo for a customer whose building is not an air-handler site."
- "Mirror the AHU demo for a different equipment class."

Do **not** invoke for: live-mode changes (`DATA_MODE=live`), UI tweaks unrelated to a new equipment class, or contract-repo work.

## Read before doing anything

These four docs are the guardrails. Every decision below routes back to one of them.

1. `AIHVAC_DASHBOARD_FRAMEWORK.md` — personas, 5-second rule, page contracts, RBAC, forbidden tooling
2. `DASHBOARD_GUI_GUIDELINES.md` — spacing, overrides, KPI bar
3. `DEMO_DEPLOYMENT.md` — what demo mode does and does not provide
4. `CLAUDE.md` (repo root) — `DATA_MODE` invariant, deployment procedure, i18n flow

If a request would violate any of these (e.g., "let's just put the chiller chart on the alarms page"), stop and surface the conflict.

## Inputs

The single intentional input is **one archetype YAML** placed at:

```
backend/app/providers/archetypes/<kind>.archetype.yaml
```

This is the canonical location — the demo provider loads from here at startup (see `backend/app/providers/archetype_loader.py`). The skill itself only owns the **schema doc** at `.claude/skills/dashboard-demo-equipment/archetypes/_README.md` and the AHU reference, which the loader treats as authoritative.

Use `backend/app/providers/archetypes/ahu.archetype.yaml` as a worked example — copy it, rename, and edit. Do not invent new top-level keys without updating `_README.md` first.

## Workflow

Treat each step as a gate. Do not start the next step until the previous one is reviewable on its own.

### 1. Confirm scope and persona fit (no code)

State in one paragraph:
- What equipment class is being added (kind, plural display name).
- Which personas will use which pages.
- What the **5-second answer** is for this equipment on the Overview page (status, alarms, energy).
- Which pages from the framework navigation are in scope, and which are explicitly out of scope.

If the 5-second answer is unclear, the archetype is not ready. Push back.

### 2. Author `<kind>.archetype.yaml`

Copy `archetypes/ahu.archetype.yaml`, rename, and edit. Follow `_README.md` strictly. Domain expert review is on this file, not on the generated code.

Required sections (see `_README.md` for full schema):
- `identity`
- `instances` (the demo seed set — 2–4 instances is the right size)
- `points` (every BACnet-style point this equipment exposes, with units, ranges, daily curves, generator hints)
- `setpoints` (subset of points that operators may override)
- `kpis` (formulae and benchmark weights)
- `alarms` (rotating demo alarms, hour-of-day windows)
- `schedule` (weekly default plus which days follow which pattern)
- `pages` (which framework pages this archetype enables; default to a sensible subset)
- `i18n` (English + 中文 strings — never ship hardcoded English in the UI)

### 3. Smoke-check the archetype

Before writing any code, validate the YAML:
- All point `unit`s are in the contracts vocabulary (°C, %RH, kPa, kW, L/s, ppm, µg/m³, ppb, CMH, RT, kW/RT, min, "").
- All KPI formulae reference only points declared in the same archetype.
- Every alarm references an `instance.id` and a point that exists.
- i18n English and Chinese key sets are identical (no missing translations).

### 4. Stamp the templates (Phase 2 — once `demo.py` consumes archetype YAML)

Until Phase 2 lands, treat templates as documentation only. Do not hand-stamp them — the goal of Phase 2 is exactly to avoid manual code duplication. If the user asks to add a new equipment type before Phase 2, do Phase 2 first or write the new provider by hand using `provider.py.tmpl` as guidance, and tell the user the archetype YAML will become the source of truth shortly.

When Phase 2 is in place, the order is:
1. `templates/provider.py.tmpl` → `backend/app/providers/demo_<kind>.py`
2. `templates/router.py.tmpl` → `backend/app/routers/<kind>.py` (with the one-line demo guard pattern)
3. `templates/equipment-detail.tsx.tmpl` → `frontend/src/app/<kind>/[id]/page.tsx`
4. Merge archetype `i18n:` block into `i18n/defaults/en.yaml` and `zh.yaml`
5. Add a sidebar entry per the framework's role visibility matrix

### 5. Acceptance (every new equipment type must pass)

Run these checks before declaring done. Each failure is a blocker, not a TODO.

**5-second rule** — Open the Overview page as a Facility Manager. Within 5 seconds, can you answer (a) is it healthy, (b) any alarms, (c) today's energy? If not, the overview card for this equipment is wrong.

**Persona discipline** — No raw point dumps on customer-visible pages. No diagnostic widgets outside `/admin/*`. No override controls outside `/equipment/[id]` and `/operate/setpoints`.

**Framework compliance** — Run `AIHVAC_DASHBOARD_FRAMEWORK.md §8` checklist mentally over every new file. Zero inline `style={{…}}`, zero hex colors, zero new charting libraries, zero `globals.css` edits.

**Demo deployability** — `docker compose -f docker-compose.demo.yml up -d --build` brings up the new equipment with no external dependencies. WebSocket updates the values every 5 seconds. Setpoint overrides survive container restart.

**i18n parity** — Toggle EN ↔ 中文 in the footer. Every visible string in the new pages flips. No untranslated English bleeds through.

**Mode invariant respected** — `DATA_MODE` is not set inline on any host. CT 204 still defaults to `live`. CT 205 still runs `docker-compose.demo.yml` which sets `DATA_MODE: demo`. (See CLAUDE.md "Dashboard live/demo invariant".)

## Forbidden in this skill

- Inventing new top-level keys in the archetype YAML without updating `_README.md` and re-validating `ahu.archetype.yaml` against the new schema.
- Adding a chart "because it looks nice." Each chart in the archetype must list the operational question it answers.
- Building the Analysis page until real (or archetype-backed) energy data exists for the equipment.
- Using Recharts, MUI, Tremor, Plotly, styled-components, or any tool not already in the dashboard. ECharts via `<EChart>` wrapper only.
- Editing `frontend/src/app/ahu/*` to "make room" for the new equipment. New equipment lives under its own `<kind>` route — see `framework §2.1`.
- Hardcoding the customer site name, IP, or credentials anywhere — these come from env vars per global preferences.

## Phasing

| Phase | What lands | Status |
|---|---|---|
| 1 | SKILL.md + archetype schema doc + AHU reference archetype + skeleton templates (illustrative). | ✅ |
| 2 | `backend/app/providers/archetype_loader.py` added; `backend/app/providers/demo.py` consumes the AHU archetype YAML for instance list, point definitions, pid offsets, rotating alarms, and setpoint suffix maps. Physics functions untouched. All parity tests pass. | ✅ |
| 3 | First non-AHU archetype shipped end-to-end: water-cooled centrifugal **chiller** archetype + `backend/app/providers/demo_chiller.py` (sibling provider, 25 points, 6 rotating alarms) + `backend/app/routers/chiller.py` (`/api/chiller`) + alarms-router merge + i18n-router merge (archetype YAML i18n folds into `/api/i18n/{lang}` automatically) + `/chiller/[id]` detail page with 4 gauges, points table, setpoint editor + sidebar "Waterside" group. Templates stayed illustrative — at one archetype each, sibling providers were cheaper than a generator script. | ✅ |
| 4 | Open per archetype: history store (`demo_chiller_history.py`) so Trends works, alarm log table for live mode, multi-archetype Overview tile composition. | pending |

## Open questions for future phases

These are deliberately *not* decided in Phase 1. Capture user decisions here before Phase 2 starts:

- **Generator language**: Pure Python at runtime, or pre-generated JSON at image-build time? AHU today is Python-at-runtime. A meter site with 50+ devices may want pre-generation.
- **Per-site override layer**: Customers may want to rename "AHU-01" to "AHU-Penthouse." Archetype YAML supports per-instance `display_name` overrides via `~/contracts/i18n/sites/<code>/`; confirm before assuming.
- **Multi-archetype dashboards**: A real building has AHUs *and* chillers *and* meters. The sidebar / equipment list / benchmark page must compose archetypes. The framework allows this; the demo doesn't yet.
- **History store size**: 3 AHUs × 50 points × 7 days × 5-min = ~120k points → ~8 MB. A chiller plant with 15 devices and richer point lists may need a larger budget or compression.
