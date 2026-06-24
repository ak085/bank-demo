import { makeAutoObservable, action } from 'mobx'
import { type Finding, SEVERITY_ORDER } from '../types/fdd'

// Lumani system points: On/Off (0,1) | Dimming (0–100) | Motion Count (0–100)
// DBS AMK: 40× cylinder lights @ 15W each = 600W rated (0.6 kW)
// Schedule targets (from ROI doc, corridors/common):
//   08:00–12:00 = 100% | 12:00–16:00 = 30% | 17:00–23:00 = 35% | 23:00–07:00 = 40% (24hr areas)
// Smart lighting baseline = 3 kWh/day (vs 14.4 kWh without); rate $0.26/kWh
export interface LightingZone {
  id: string
  zoneId: string      // "LT-01"
  room: string        // "Banking Hall"
  // Points
  onOff: boolean      // API: 0/1
  dimming: number     // API: 0–100%
  motionCount: number // API: 0–100 (occupancy proxy from PIR sensor count)
  // Derived
  powerW: number          // actual measured (rated × dimming/100 if driver healthy)
  ratedPowerW: number     // rated at 100% dimming (from fixture schedule)
  expectedPowerW: number  // what we expect based on schedule and dimming
  minutesNoMotion: number // rolling counter; reset when motionCount > 0
  scheduledDimming: number // what the schedule calls for at current hour
  // Energy
  kwhToday: number
  kwhSavedToday: number  // vs rated 24hr
  motionTimeout: number  // minutes before auto-off trigger (configurable)
}

function gauss(mean: number, std: number) {
  const u = 1 - Math.random(), v = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// AMK ROI schedule targets
function scheduledDimming(hour: number): number {
  if (hour >= 8  && hour < 12) return 100
  if (hour >= 12 && hour < 17) return 30
  if (hour >= 17 && hour < 23) return 35
  return 40  // night (23–07)
}

export class LightingStore {
  zones: LightingZone[] = [
    {
      id: 'lt-01', zoneId: 'LT-01', room: 'Banking Hall',
      onOff: true, dimming: 75, motionCount: 0,
      powerW: 450,        // high power even though no one's there
      ratedPowerW: 600,   // 40× 15W = 600W rated
      expectedPowerW: 420, // expect ~70% from smart schedule
      minutesNoMotion: 42,  // ← FDD-LT-O1 will trigger (lights on, empty)
      scheduledDimming: scheduledDimming(new Date().getHours()),
      kwhToday: 2.1, kwhSavedToday: 1.9, motionTimeout: 20,
    },
    {
      id: 'lt-02', zoneId: 'LT-02', room: 'Customer Service Area',
      onOff: true, dimming: 80, motionCount: 55,
      powerW: 195,
      ratedPowerW: 225,   // 15× 15W
      expectedPowerW: 180,
      minutesNoMotion: 0,
      scheduledDimming: scheduledDimming(new Date().getHours()),
      kwhToday: 0.9, kwhSavedToday: 0.5, motionTimeout: 20,
    },
    {
      id: 'lt-03', zoneId: 'LT-03', room: "Manager's Office",
      onOff: true, dimming: 60, motionCount: 10,
      powerW: 55,
      ratedPowerW: 90,    // 6× 15W
      expectedPowerW: 54,
      minutesNoMotion: 5,
      scheduledDimming: scheduledDimming(new Date().getHours()),
      kwhToday: 0.3, kwhSavedToday: 0.2, motionTimeout: 20,
    },
    {
      id: 'lt-04', zoneId: 'LT-04', room: 'Interview Room',
      onOff: false, dimming: 0, motionCount: 0,
      powerW: 0,
      ratedPowerW: 60,    // 4× 15W
      expectedPowerW: 0,
      minutesNoMotion: 90,
      scheduledDimming: scheduledDimming(new Date().getHours()),
      kwhToday: 0.05, kwhSavedToday: 0.25, motionTimeout: 20,
    },
    {
      id: 'lt-05', zoneId: 'LT-05', room: 'Corridor / Entrance',
      onOff: true, dimming: 40, motionCount: 8,
      powerW: 42,
      ratedPowerW: 90,    // 6× 15W; corridor runs 24hr
      expectedPowerW: 36,
      minutesNoMotion: 8,
      scheduledDimming: 40,
      kwhToday: 0.7, kwhSavedToday: 0.6, motionTimeout: 30,
    },
    {
      id: 'lt-06', zoneId: 'LT-06', room: 'Staff Back Office',
      onOff: true, dimming: 30, motionCount: 4,
      powerW: 128,        // ← anomaly: dimming=30% but consuming 128W out of 135W rated
      ratedPowerW: 135,   // 9× 15W
      expectedPowerW: 41, // expect 30% of rated = ~40W
      minutesNoMotion: 12,
      scheduledDimming: scheduledDimming(new Date().getHours()),
      kwhToday: 0.8, kwhSavedToday: 0.0, motionTimeout: 20,
    },
  ]

  powerHistory: { time: string; actual: number; expected: number; baseline: number }[] = []

  private _interval: ReturnType<typeof setInterval> | null = null

  constructor() {
    makeAutoObservable(this)
    this._initHistory()
    this.startTicking()
  }

  // ─── FDD computed ─────────────────────────────────────────────────────────

  get allFindings(): Finding[] {
    const out: Finding[] = []
    for (const z of this.zones) out.push(...this._findingsFor(z))
    return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }

  zoneHealth(z: LightingZone): 'ok' | 'warning' | 'critical' {
    const f = this._findingsFor(z)
    if (f.some(x => x.severity === 'critical')) return 'critical'
    if (f.some(x => x.severity === 'warning'))  return 'warning'
    return 'ok'
  }

  private _findingsFor(z: LightingZone): Finding[] {
    const f: Finding[] = []
    const hour = new Date().getHours()

    // FDD-LT-D1 — Dimming not reducing power (likely LED driver fault)
    if (z.onOff && z.dimming > 0) {
      const dimRatio = z.powerW / (z.ratedPowerW * (z.dimming / 100))
      if (dimRatio > 1.8 && z.dimming < 60) {
        f.push({
          ruleId: 'FDD-LT-D1', severity: 'warning', unit: z.room,
          title: 'Dimming command not reducing power',
          detail: `${z.zoneId}: Set to ${z.dimming}% dimming but consuming ${z.powerW.toFixed(0)}W — expected ≈${(z.ratedPowerW * z.dimming / 100).toFixed(0)}W. Dimming ratio is ${dimRatio.toFixed(1)}×. This indicates an LED driver fault or a wired bypass.`,
          recommendation: 'Inspect LED driver for each fixture in this zone. A failed driver may run at full power regardless of control signal. Test by sending a dimming command via the Lumani API and monitoring the measured power response.',
          triggerValue: `${z.powerW.toFixed(0)}W vs ~${(z.ratedPowerW * z.dimming / 100).toFixed(0)}W expected`,
        })
      }
    }

    // FDD-LT-O1 — Lights on, no occupancy for extended period
    if (z.onOff && z.dimming > 10 && z.motionCount === 0 && z.minutesNoMotion > 20) {
      f.push({
        ruleId: 'FDD-LT-O1', severity: 'warning', unit: z.room,
        title: `Lights on in unoccupied room (${z.minutesNoMotion} min)`,
        detail: `${z.zoneId}: Lights ON at ${z.dimming}% dimming, but motion sensor reports zero occupancy for ${z.minutesNoMotion} minutes. Current draw: ${z.powerW.toFixed(0)}W being wasted in an empty space.`,
        recommendation: `Activate auto-off schedule: set lights to 0% after 20 min of no motion. Energy cost of this incident: ≈$${(z.powerW / 1000 * z.minutesNoMotion / 60 * 0.26).toFixed(3)} so far. Verify that occupancy sensor coverage is adequate for the room geometry.`,
        triggerValue: `${z.minutesNoMotion} min no motion`,
      })
    }

    // FDD-LT-S1 — Dimming significantly above schedule target
    if (z.onOff && z.dimming > z.scheduledDimming + 25 && z.motionCount < 30) {
      f.push({
        ruleId: 'FDD-LT-S1', severity: 'info', unit: z.room,
        title: 'Operating above scheduled dimming level',
        detail: `${z.zoneId}: Currently at ${z.dimming}% dimming but schedule calls for ${z.scheduledDimming}% at this hour (${hour}:00). Likely a manual override. Occupancy is ${z.motionCount}% — low occupancy does not justify the override.`,
        recommendation: `Reset to scheduled dimming (${z.scheduledDimming}%). Energy impact: +${((z.dimming - z.scheduledDimming) / 100 * z.ratedPowerW / 1000 * 0.26).toFixed(3)} $/hr above target.`,
        triggerValue: `${z.dimming}% vs ${z.scheduledDimming}% target`,
      })
    }

    // FDD-LT-AH1 — Active outside business hours
    if (z.onOff && (hour < 7 || hour >= 22) && z.room !== 'Corridor / Entrance') {
      f.push({
        ruleId: 'FDD-LT-AH1', severity: 'info', unit: z.room,
        title: 'Active outside business hours',
        detail: `${z.zoneId} is ON at ${hour}:00 — outside normal operating window (07:00–22:00). Consuming ${z.powerW.toFixed(0)}W without confirmed occupancy.`,
        recommendation: 'Verify if after-hours access is scheduled. If not, switch off via Lumani API. After-hours energy tracking can identify security or operational issues.',
        triggerValue: `${hour}:00 active`,
      })
    }

    // FDD-LT-MS1 — Motion sensor likely faulty (high-traffic area, zero count during business hours)
    const businessHours = hour >= 9 && hour < 18
    const highTraffic = ['Banking Hall', 'Customer Service Area'].includes(z.room)
    if (businessHours && highTraffic && z.motionCount === 0 && z.minutesNoMotion > 30) {
      f.push({
        ruleId: 'FDD-LT-MS1', severity: 'warning', unit: z.room,
        title: 'Possible occupancy sensor fault',
        detail: `${z.room} is a high-traffic area expected to be occupied during business hours, but motion count has been zero for ${z.minutesNoMotion} minutes. This is statistically unlikely unless the sensor has failed.`,
        recommendation: 'Physically inspect the PIR sensor — check for obstruction, LED indicator, and communication link to the Lumani hub. Re-calibrate sensor sensitivity if needed.',
        triggerValue: `${z.minutesNoMotion} min zero count`,
      })
    }

    return f
  }

  // ─── Control actions ──────────────────────────────────────────────────────

  setDimming(zoneId: string, pct: number) {
    const z = this.zones.find(x => x.id === zoneId)
    if (z) z.dimming = Math.max(0, Math.min(100, Math.round(pct)))
  }

  toggleZone(zoneId: string) {
    const z = this.zones.find(x => x.id === zoneId)
    if (z) {
      z.onOff = !z.onOff
      if (!z.onOff) z.dimming = 0
    }
  }

  setMotionTimeout(zoneId: string, minutes: number) {
    const z = this.zones.find(x => x.id === zoneId)
    if (z) z.motionTimeout = minutes
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  get totalPowerKw() { return this.zones.reduce((s, z) => s + z.powerW, 0) / 1000 }
  get totalExpectedKw() { return this.zones.reduce((s, z) => s + z.expectedPowerW, 0) / 1000 }
  get totalSavedKwh()  { return this.zones.reduce((s, z) => s + z.kwhSavedToday, 0) }
  get activeZones()    { return this.zones.filter(z => z.onOff).length }
  get savingsSgd()     { return this.totalSavedKwh * 0.26 }

  // Energy baseline vs optimised (from 24-h history comparison)
  get ltBaselineKwh()  { return Math.round(this.powerHistory.reduce((s, h) => s + h.baseline, 0) * 10) / 10 }
  get ltOptimisedKwh() { return Math.round(this.powerHistory.reduce((s, h) => s + h.actual,   0) * 10) / 10 }
  get ltSavedKwh()     { return Math.max(0, Math.round((this.ltBaselineKwh - this.ltOptimisedKwh) * 10) / 10) }

  // ─── History ──────────────────────────────────────────────────────────────

  private _initHistory() {
    const now = new Date()
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3_600_000)
      const h = t.getHours()
      const sched = scheduledDimming(h)
      const totalRated = this.zones.reduce((s, z) => s + z.ratedPowerW, 0) / 1000
      const expected = +(totalRated * sched / 100).toFixed(2)
      const actual   = +(gauss(expected * 1.15, 0.05)).toFixed(2)  // slightly above schedule
      // Baseline = old fixed system: ~95% of rated during business hours, 60% at night
      const businessH = h >= 7 && h < 22
      const baseline  = +(totalRated * (businessH ? 0.95 : 0.60)).toFixed(2)
      this.powerHistory.push({ time: `${String(h).padStart(2, '0')}:00`, actual, expected, baseline })
    }
  }

  startTicking() {
    this._interval = setInterval(action(() => this._tick()), 5000)
  }
  stopTicking() { if (this._interval) clearInterval(this._interval) }

  private _tick() {
    const hour = new Date().getHours()
    for (const z of this.zones) {
      z.scheduledDimming = scheduledDimming(hour)
      if (!z.onOff) continue
      // Motion
      z.motionCount = z.id === 'lt-01'
        ? 0   // Banking Hall stays empty for demo
        : clamp(Math.round(gauss(z.motionCount, 5)), 0, 100)
      if (z.motionCount > 0) z.minutesNoMotion = 0
      else z.minutesNoMotion += 5 / 60 * 5  // 5-second tick ≈ 0.08 min
      // Power: Staff Back Office driver fault — stays high regardless of dimming
      if (z.id === 'lt-06') {
        z.powerW = clamp(gauss(128, 3), 115, 140)  // stays near rated despite dim=30%
      } else {
        z.powerW = clamp(gauss(z.ratedPowerW * (z.dimming / 100), z.ratedPowerW * 0.03), 0, z.ratedPowerW * 1.1)
      }
      z.kwhToday += z.powerW / 1000 * 5 / 3600
    }
    for (const z of this.zones) {
      z.expectedPowerW = z.ratedPowerW * (z.scheduledDimming / 100) * (z.onOff ? 1 : 0)
    }
  }
}
