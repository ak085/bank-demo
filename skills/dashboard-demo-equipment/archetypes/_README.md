# Equipment Archetype YAML — Schema Reference

An **archetype** describes one class of equipment (AHU, chiller, boiler, VRF, lighting controller, energy meter, …) completely enough that the dashboard-demo can generate realistic data, render the framework pages, and surface KPIs and alarms with zero code edits per instance.

This document is the source of truth for the YAML **structure**. The reference archetype is the AHU file at `backend/app/providers/archetypes/ahu.archetype.yaml` — that's also where new archetypes are authored, since the demo provider loads from that path at startup.

---

## File layout

```yaml
identity:        # what this equipment is
instances:       # the demo seed set
points:          # every signal the equipment exposes
setpoints:       # subset of points operators may override
kpis:            # derived metrics + benchmark weights
alarms:          # rotating demo alarms
schedule:        # weekly operating pattern
pages:           # which framework pages this archetype enables
i18n:            # display strings, EN + 中文
```

Every top-level key is required. If a section is genuinely empty for an archetype (e.g., lighting with no schedule), set it to `[]` or `{}` explicitly and add a `note:` explaining why — never omit the key.

---

## `identity`

```yaml
identity:
  kind: ahu                       # lowercase, kebab-case, used in URLs and code identifiers
  display_name_en: Air Handler    # singular, capitalised
  display_name_zh: 空气处理机组
  plural_en: Air Handlers
  plural_zh: 空气处理机组列表
  icon: Wind                      # lucide-react icon name (validated against installed icons)
  haystack_marker: ahu            # haystack-style tag, used in mqtt_topic and haystackName
  description_en: >
    One sentence describing what the equipment does, from the facility manager's
    perspective. Will surface on the equipment list page as a subtitle.
  description_zh: |
    一句话描述。
```

`kind` becomes the route segment (`/ahu`, `/chiller`, `/meter`), the provider module name (`demo_<kind>.py`), and the haystack tag. Choose carefully — renaming later is expensive.

---

## `instances`

The demo seed set. Keep it small — 2 to 4 instances. The point of the demo is to show the *shape* of a customer's data, not their full fleet.

```yaml
instances:
  - id: "01"                      # zero-padded; used in haystackName segments
    name_en: AHU-01
    name_zh: AHU-01
    location_en: Main Office
    location_zh: 主办公区
    point_id_base: 100            # ahu_id * 100 in the AHU reference; pick a unique base per instance
    variance:                     # per-instance offsets layered on top of point defaults
      load_bias: 0.0              # -0.2 to +0.2; shifts the load curve up/down
      energy_outlier: 1.0         # multiplier on ElecKW; >1.0 makes this unit "the inefficient one"
```

`variance.*` keys exist purely to produce a non-flat demo. The AHU archetype uses `energy_outlier: 1.25` on AHU-03 so the benchmark page has a clear loser.

---

## `points`

Every signal — sensor, setpoint, control, status, command, calculated. One entry per point.

```yaml
points:
  - suffix: SAT                   # BACnet-style point name; goes into haystackName as ahu.01.SAT
    pid_offset: 1                 # added to instance.point_id_base for the numeric pointId
    label_key: points.sat         # i18n key under the archetype's i18n: block
    type: AI                      # AI/AO/BI/BO/AV/BV — drives type badge on the Live Points page
    unit: °C                      # must come from the units vocabulary (see below)
    range: [10, 35]               # gauge axis range on the equipment page
    quality_default: good         # good | bad | uncertain
    generator:                    # how the demo provider should fabricate values
      kind: sine_with_load        # see "generator kinds" below
      base: 13.0                  # the value when load = 0
      amplitude: 1.5              # how much it swings with load
      noise_stddev: 0.15          # Gaussian noise stddev
      depends_on:
        running: true             # if false, the point reads 0 / null
    historical: true              # include in the 7-day pre-generated history store
    pages:                        # which pages display this point
      - equipment_detail
      - trends
      - overview_kpi              # contributes to a sparkline / KPI tile
```

### Generator kinds

The provider in Phase 2 will read `generator.kind` and dispatch. Initial kinds (extend as needed, document additions here):

- `constant` — `value`
- `sine_with_load` — `base + amplitude * sin(2π * t / period) + N(0, noise_stddev)`; respects `depends_on.running`
- `load_proportional` — `base + slope * load + N(0, noise_stddev)`; `load` is the schedule-driven 0..1 envelope
- `binary_status` — 0/1 from `depends_on.running`
- `setpoint` — reads from setpoint override store, falls back to `default_value`
- `derived` — `formula: "ElecKW / CoolingRT"` — must reference other suffixes in this archetype

Every other generator kind requires updating the provider and this README in the same commit.

### Units vocabulary

Allowed `unit:` values (extend cautiously):

```
°C, °F, %RH, %, kPa, Pa, kW, kWh, W, V, A, L/s, m³/h, CMH, RT, kW/RT,
ppm, ppb, µg/m³, lux, dB, Hz, rpm, min, h, s, ""
```

Empty string `""` is for unit-less binary status points.

---

## `setpoints`

Subset of `points[]` (referenced by `suffix`) that operators may write through `/operate/setpoints` and `/equipment/[id]`. Values persist in the demo SQLite (`demo_state.py`).

```yaml
setpoints:
  - suffix: SATSP
    label_key: points.sat_sp
    default_value: 13.0
    valid_range: [10.0, 18.0]     # API rejects writes outside this
    step: 0.5                     # slider increment in the edit dialog
    role_required: operator
```

---

## `kpis`

KPIs power the Overview page tiles and the Analysis pages. Every KPI must answer one operational question.

```yaml
kpis:
  - id: kw_per_rt
    label_key: kpis.kw_per_rt
    unit: kW/RT
    question_en: How efficiently is the cooling plant running right now?
    formula: avg(ElecKW) / avg(CoolingRT)
    benchmark_weight: 0.35        # weight in the composite benchmark score; weights must sum to 1.0
    direction: lower_is_better    # lower_is_better | higher_is_better
    overview_widget: stat_bar     # stat_bar | sparkline | gauge | none
```

`benchmark_weight` values across the archetype's KPIs **must sum to 1.0**. The smoke check (Step 3 of SKILL.md) validates this.

---

## `alarms`

Rotating demo alarms, keyed by hour-of-day. The pattern matches `ROTATING_ALARMS` in the current AHU `demo.py`.

```yaml
alarms:
  - id: demo-filter-01
    severity: minor               # info | minor | major | critical
    instance_id: "01"             # must match an instances[].id
    point_suffix: DPFB            # optional — which point the alarm is "about"
    hour_start: 8
    hour_stop: 23
    message_key: alarms.filter_dp_rising
    message_vars: {}              # optional — variables substituted into the
                                  # message template at runtime via str.format()
                                  # e.g. message_vars: { delta: 2.4 }
```

---

## `schedule`

Weekly operating pattern. Drives the running envelope that `load_proportional` and `sine_with_load` generators key off.

```yaml
schedule:
  defaults:
    mon: { start: 420, stop: 1140 }   # 07:00–19:00, minutes from midnight
    tue: { start: 420, stop: 1140 }
    wed: { start: 420, stop: 1140 }
    thu: { start: 420, stop: 1140 }
    fri: { start: 420, stop: 1140 }
    sat: { start: 480, stop: 780  }   # 08:00–13:00
    sun: { start: null, stop: null }  # off
  overridable: true                   # if true, demo persists user edits in SQLite
```

If `overridable: false`, the schedule UI shows the pattern read-only.

---

## `pages`

Which framework pages this archetype enables, and any per-page configuration.

```yaml
pages:
  overview:
    enabled: true
    card_layout: status_value     # status_value | gauge_compact | sparkline
    card_value_point: SAT         # which point appears as "the number" on the overview card
  equipment_detail:
    enabled: true
    schematic_svg: ahu_flow.svg   # filename in frontend/public/schematics/
    primary_gauges: [SAT, RAT]    # which points get gauges
  monitor_points:
    enabled: true                 # adds this archetype's points to the global Live Points table
  monitor_trends:
    enabled: true
  monitor_alarms:
    enabled: true
  operate_schedules:
    enabled: true
  operate_setpoints:
    enabled: true
  analysis_thermal:
    enabled: false                # do not enable until thermal KPI data is meaningful
  analysis_electrical:
    enabled: true
```

The framework's navigation skeleton stays fixed — `pages:` only controls *whether this archetype contributes* to each section.

---

## `i18n`

EN + 中文 dictionaries for every key referenced by `label_key`, `message_key`, `question_*`, etc. Keys are namespaced under the archetype `kind` to avoid collisions when multiple archetypes co-exist.

```yaml
i18n:
  en:
    points:
      sat: Supply Air Temp
      rat: Return Air Temp
    kpis:
      kw_per_rt: Cooling Plant Efficiency
    alarms:
      filter_dp_rising: Filter ΔP trending upward — maintenance due
  zh:
    points:
      sat: 送风温度
      rat: 回风温度
    kpis:
      kw_per_rt: 冷站效率
    alarms:
      filter_dp_rising: 过滤器压差上升 — 需要维护
```

EN and 中文 key sets must be identical. The Phase 1 smoke check validates this by set-comparing.

---

## What goes where — common mistakes

| Tempting to put in… | Belongs in… | Why |
|---|---|---|
| `points[]` (e.g., "filter_status: derived from DPFB > 250") | A KPI or an alarm | Points are signals from the device. Derived booleans are alarms or KPIs. |
| `instances[].variance.load_bias` for a "broken unit" | An alarm with `severity: major` | Variance is for visual interest. Genuine failure modes are alarms. |
| Hardcoded English in `alarms[].message_key` | `i18n.en.alarms.<key>` | Every string must be translatable. |
| Site-specific tweaks ("Tower 3, Floor 7") | `~/contracts/i18n/sites/<site>/zh.yaml` | Archetypes are reusable across customers; site overrides are per-customer. |

---

## Adding a new field to the schema

1. Update this `_README.md` with the field, allowed values, and a worked example.
2. Update `ahu.archetype.yaml` to use the new field (or explicitly opt out with a comment).
3. Update the smoke check (Phase 1) and the provider (Phase 2) to handle the new field.
4. Commit all three changes together — never let the schema doc drift from the reference archetype.
