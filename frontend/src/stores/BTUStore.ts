import { makeAutoObservable, action } from 'mobx'
import { type Finding, SEVERITY_ORDER } from '../types/fdd'

// BTU meter points per branch:
//   - Chilled water flow meter (m³/h)
//   - Supply temperature sensor (°C)
//   - Return temperature sensor (°C)
//   - BTU = ρ × Cp × Flow × ΔT  → kW thermal
// Billing: charged per kWh thermal, rate ≈ SGD 0.088/kWh (chilled water tariff)
// Target ΔT: ≥ 5°C (industry standard); <4°C triggers investigation

export interface Branch {
  id: string
  name: string         // "Branch 1"
  // Meter points
  supplyTempC: number  // chilled water supply to branch
  returnTempC: number  // return from branch AHU/FCU
  deltaT: number       // returnTemp - supplyTemp (target ≥ 5°C)
  flowM3h: number      // volumetric flow rate m³/h
  btuKw: number        // instantaneous thermal demand kW
  // Daily tracking
  btuKwhToday: number
  afterHoursKwhToday: number  // consumed outside 08:00–20:00
  // Monthly billing cycle (billing on 1st–end of month)
  btuKwhMtd: number
  btuKwhMtdExpected: number  // based on historical average for this day-of-month
  billingRateSgd: number     // SGD per kWh thermal
  // Derived
  billingMtdSgd: number
  billingProjectedSgd: number
  mtdDeviationPct: number    // % above/below expected
  // Health
  operatingHours: boolean    // is this the branch's operating window?
}

function gauss(mean: number, std: number) {
  const u = 1 - Math.random(), v = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// BTU kW from flow and temps (simplified: water ρ=1000 kg/m³, Cp=4.186 kJ/(kg·K))
function calcBtuKw(flowM3h: number, supplyC: number, returnC: number): number {
  return (flowM3h / 3.6) * 4.186 * (returnC - supplyC)  // kW
}

const RATE = 0.088  // SGD/kWh chilled water tariff

// Day of month (1-based) — for MTD expected calculation
const dayOfMonth = new Date().getDate()
const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

export class BTUStore {
  // ─── Configurable alert thresholds ────────────────────────────────────────
  deltaTWarning    = 4.5   // °C — below this triggers warning
  deltaTCritical   = 3.5   // °C — below this triggers critical
  supplyTempHigh   = 8.5   // °C — above this triggers supply temp warning
  supplyTempLow    = 5.5   // °C — below this triggers condensation advisory
  billingDeviation = 15    // % — MTD over-budget warning threshold
  afterHoursKwh    = 2.0   // kWh — after-hours consumption alert

  branches: Branch[] = [
    // Normal ΔT, normal billing
    {
      id: 'br-1', name: 'Branch 1',
      supplyTempC: 7.0, returnTempC: 12.3, deltaT: 5.3, flowM3h: 0.68,
      btuKw: calcBtuKw(0.68, 7.0, 12.3),
      btuKwhToday: 42.1, afterHoursKwhToday: 1.2,
      btuKwhMtd: 42.1 * dayOfMonth,
      btuKwhMtdExpected: 44 * dayOfMonth,
      billingRateSgd: RATE,
      billingMtdSgd: 42.1 * dayOfMonth * RATE,
      billingProjectedSgd: 44 * daysInMonth * RATE,
      mtdDeviationPct: -4.3,
      operatingHours: true,
    },
    {
      id: 'br-2', name: 'Branch 2',
      supplyTempC: 8.9, returnTempC: 13.5, deltaT: 4.6, flowM3h: 0.55,
      btuKw: calcBtuKw(0.55, 8.9, 13.5),
      btuKwhToday: 31.0, afterHoursKwhToday: 0.4,
      btuKwhMtd: 31 * dayOfMonth,
      btuKwhMtdExpected: 30 * dayOfMonth,
      billingRateSgd: RATE,
      billingMtdSgd: 31 * dayOfMonth * RATE,
      billingProjectedSgd: 30 * daysInMonth * RATE,
      mtdDeviationPct: 3.3,
      operatingHours: true,
    },
    // Low ΔT — critical
    {
      id: 'br-3', name: 'Branch 3',
      supplyTempC: 7.2, returnTempC: 10.3, deltaT: 3.1, flowM3h: 1.45,
      btuKw: calcBtuKw(1.45, 7.2, 10.3),
      btuKwhToday: 58.8, afterHoursKwhToday: 3.1,
      btuKwhMtd: 58.8 * dayOfMonth,
      btuKwhMtdExpected: 48 * dayOfMonth,
      billingRateSgd: RATE,
      billingMtdSgd: 58.8 * dayOfMonth * RATE,
      billingProjectedSgd: 48 * daysInMonth * RATE,
      mtdDeviationPct: 22.5,  // also over-budget due to excessive flow
      operatingHours: true,
    },
    // High supply temp — plant issue
    {
      id: 'br-4', name: 'Branch 4',
      supplyTempC: 9.2, returnTempC: 14.1, deltaT: 4.9, flowM3h: 0.72,
      btuKw: calcBtuKw(0.72, 9.2, 14.1),
      btuKwhToday: 53.2, afterHoursKwhToday: 2.8,
      btuKwhMtd: 53.2 * dayOfMonth,
      btuKwhMtdExpected: 45 * dayOfMonth,
      billingRateSgd: RATE,
      billingMtdSgd: 53.2 * dayOfMonth * RATE,
      billingProjectedSgd: 45 * daysInMonth * RATE,
      mtdDeviationPct: 18.2,  // FDD-BTU-BD1 trigger
      operatingHours: true,
    },
    {
      id: 'br-5', name: 'Branch 5',
      supplyTempC: 6.8, returnTempC: 12.1, deltaT: 5.3, flowM3h: 0.52,
      btuKw: calcBtuKw(0.52, 6.8, 12.1),
      btuKwhToday: 29.5, afterHoursKwhToday: 0.3,
      btuKwhMtd: 29.5 * dayOfMonth,
      btuKwhMtdExpected: 30 * dayOfMonth,
      billingRateSgd: RATE,
      billingMtdSgd: 29.5 * dayOfMonth * RATE,
      billingProjectedSgd: 30 * daysInMonth * RATE,
      mtdDeviationPct: -1.7,
      operatingHours: true,
    },
    {
      id: 'br-6', name: 'Branch 6',
      supplyTempC: 7.1, returnTempC: 12.6, deltaT: 5.5, flowM3h: 0.45,
      btuKw: calcBtuKw(0.45, 7.1, 12.6),
      btuKwhToday: 25.1, afterHoursKwhToday: 0.1,
      btuKwhMtd: 25.1 * dayOfMonth,
      btuKwhMtdExpected: 26 * dayOfMonth,
      billingRateSgd: RATE,
      billingMtdSgd: 25.1 * dayOfMonth * RATE,
      billingProjectedSgd: 26 * daysInMonth * RATE,
      mtdDeviationPct: -3.5,
      operatingHours: true,
    },
  ]

  btuHistory: { time: string; [branchId: string]: number | string }[] = []

  private _interval: ReturnType<typeof setInterval> | null = null

  constructor() {
    makeAutoObservable(this)
    this._initHistory()
    this.startTicking()
  }

  // ─── FDD computed ─────────────────────────────────────────────────────────

  get allFindings(): Finding[] {
    const out: Finding[] = []
    for (const b of this.branches) out.push(...this._findingsFor(b))
    return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }

  branchHealth(b: Branch): 'ok' | 'warning' | 'critical' {
    const f = this._findingsFor(b)
    if (f.some(x => x.severity === 'critical')) return 'critical'
    if (f.some(x => x.severity === 'warning'))  return 'warning'
    return 'ok'
  }

  private _findingsFor(b: Branch): Finding[] {
    const f: Finding[] = []

    // FDD-BTU-DT1 — Low ΔT (primary billing efficiency indicator)
    if (b.deltaT < this.deltaTCritical) {
      f.push({
        ruleId: 'FDD-BTU-DT1', severity: 'critical', unit: b.name,
        title: `Critical low ΔT — ${b.deltaT.toFixed(1)}°C (target ≥ 5°C)`,
        detail: `Return temperature is only ${b.deltaT.toFixed(1)}°C above supply (${b.supplyTempC.toFixed(1)}°C → ${b.returnTempC.toFixed(1)}°C). This means chilled water is passing through with minimal heat exchange. Flow rate is ${b.flowM3h.toFixed(2)} m³/h — likely a bypass valve stuck open or a control valve fault. High flow at low ΔT means the branch is drawing significantly more chilled water than the heat load justifies, increasing pumping energy and reducing plant efficiency. Billing impact: you are paying for ${b.btuKw.toFixed(1)} kW but effective utilisation of that water is low.`,
        recommendation: 'Inspect bypass valve and AHU/FCU control valves for this branch. A stuck-open bypass is the most common cause. Check for oversized flow — consider installing a flow limiter or reprogramming the control valve maximum position. Target: raise ΔT to ≥5°C by reducing flow.',
        triggerValue: `ΔT ${b.deltaT.toFixed(1)}°C`,
      })
    } else if (b.deltaT < this.deltaTWarning) {
      f.push({
        ruleId: 'FDD-BTU-DT1', severity: 'warning', unit: b.name,
        title: `Low ΔT — ${b.deltaT.toFixed(1)}°C (target ≥ 5°C)`,
        detail: `ΔT of ${b.deltaT.toFixed(1)}°C is below the 5°C design target. Branch is consuming more chilled water flow than necessary for the current load. Flow: ${b.flowM3h.toFixed(2)} m³/h.`,
        recommendation: 'Check control valve position and coil condition. Minor blockage in the return circuit can reduce ΔT. Monitor trend — if ΔT continues to drop, inspect bypass valve.',
        triggerValue: `ΔT ${b.deltaT.toFixed(1)}°C`,
      })
    }

    // FDD-BTU-ST1 — High supply temperature
    if (b.supplyTempC > this.supplyTempHigh) {
      f.push({
        ruleId: 'FDD-BTU-ST1', severity: 'warning', unit: b.name,
        title: `High chilled water supply temperature — ${b.supplyTempC.toFixed(1)}°C`,
        detail: `Supply temperature is ${b.supplyTempC.toFixed(1)}°C, above the expected range of 6–8°C. This is typically a plant-side issue (central chiller not meeting demand), not a branch-level fault. However, it reduces the effective cooling capacity at this branch.`,
        recommendation: 'Alert the chilled water plant operator. If supply temp is consistently above 8°C, the branch AHU may need to run at higher airflow to compensate. Check if this correlates with peak demand hours.',
        triggerValue: `${b.supplyTempC.toFixed(1)}°C supply`,
      })
    }

    // FDD-BTU-ST2 — Abnormally low supply temp (condensation risk)
    if (b.supplyTempC < this.supplyTempLow) {
      f.push({
        ruleId: 'FDD-BTU-ST2', severity: 'info', unit: b.name,
        title: `Supply temperature unusually low — ${b.supplyTempC.toFixed(1)}°C`,
        detail: `Supply at ${b.supplyTempC.toFixed(1)}°C is below the typical 6°C minimum. In humid Singapore conditions, this may cause condensation on exposed chilled water pipes, contributing to water damage or reduced insulation effectiveness.`,
        recommendation: 'Inspect pipe insulation at branch connections. Notify plant operator to verify chiller leaving water temperature setpoint.',
        triggerValue: `${b.supplyTempC.toFixed(1)}°C supply`,
      })
    }

    // FDD-BTU-BD1 — Billing deviation (MTD vs expected)
    if (b.mtdDeviationPct > this.billingDeviation) {
      f.push({
        ruleId: 'FDD-BTU-BD1', severity: 'warning', unit: b.name,
        title: `Month-to-date consumption ${b.mtdDeviationPct.toFixed(1)}% above expected`,
        detail: `MTD: ${b.btuKwhMtd.toFixed(0)} kWh vs expected ${b.btuKwhMtdExpected.toFixed(0)} kWh (${b.mtdDeviationPct > 0 ? '+' : ''}${b.mtdDeviationPct.toFixed(1)}%). Projected month-end bill: SGD ${b.billingProjectedSgd.toFixed(0)} — actual on track for SGD ${(b.btuKwhMtd / dayOfMonth * daysInMonth * b.billingRateSgd).toFixed(0)}. This deviation may indicate ΔT inefficiency (higher flow than needed) or genuine load increase.`,
        recommendation: 'Cross-check with low ΔT findings. If ΔT is also low, the excess consumption is due to flow waste — fix the control valve first. If ΔT is normal but kWh is high, the branch genuinely has more cooling load (verify with occupancy data).',
        triggerValue: `+${b.mtdDeviationPct.toFixed(1)}% MTD`,
      })
    } else if (b.mtdDeviationPct > 10) {
      f.push({
        ruleId: 'FDD-BTU-BD1', severity: 'info', unit: b.name,
        title: `MTD consumption slightly above expected (+${b.mtdDeviationPct.toFixed(1)}%)`,
        detail: `Consumption is ${b.mtdDeviationPct.toFixed(1)}% above the monthly baseline. Within an acceptable tolerance for now, but trending upward.`,
        recommendation: 'Monitor ΔT trend. No action required unless deviation exceeds 15%.',
        triggerValue: `+${b.mtdDeviationPct.toFixed(1)}% MTD`,
      })
    }

    // FDD-BTU-AH1 — After-hours consumption
    if (b.afterHoursKwhToday > this.afterHoursKwh) {
      f.push({
        ruleId: 'FDD-BTU-AH1', severity: 'info', unit: b.name,
        title: `After-hours chilled water consumption — ${b.afterHoursKwhToday.toFixed(1)} kWh today`,
        detail: `${b.afterHoursKwhToday.toFixed(1)} kWh was consumed outside branch operating hours (08:00–20:00). This contributes to billing without confirmed occupancy and may indicate a control system not shutting valves after closing time.`,
        recommendation: 'Verify branch closure procedures. Check if AHU/FCU is programmed to shut down valves at 20:00. If server room or 24hr equipment requires cooling, document and exclude from after-hours alert threshold.',
        triggerValue: `${b.afterHoursKwhToday.toFixed(1)} kWh off-hours`,
      })
    }

    return f
  }

  // ─── Control actions ──────────────────────────────────────────────────────

  setDeltaTThresholds(warning: number, critical: number) {
    this.deltaTWarning  = warning
    this.deltaTCritical = critical
  }

  setSupplyTempThresholds(high: number, low: number) {
    this.supplyTempHigh = high
    this.supplyTempLow  = low
  }

  setBillingDeviation(pct: number) { this.billingDeviation = pct }
  setAfterHoursKwh(kwh: number)   { this.afterHoursKwh    = kwh }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  get totalBtuKw()     { return this.branches.reduce((s, b) => s + b.btuKw, 0) }
  get totalKwhToday()  { return this.branches.reduce((s, b) => s + b.btuKwhToday, 0) }
  get totalMtdSgd()    { return this.branches.reduce((s, b) => s + b.billingMtdSgd, 0) }
  get avgDeltaT()      { return this.branches.reduce((s, b) => s + b.deltaT, 0) / this.branches.length }
  get lowDeltaTCount() { return this.branches.filter(b => b.deltaT < 4.5).length }

  get mtdDeviationAvg() {
    return this.branches.reduce((s, b) => s + b.mtdDeviationPct, 0) / this.branches.length
  }

  // ─── History ──────────────────────────────────────────────────────────────

  private _initHistory() {
    const now = new Date()
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3_600_000)
      const hour = t.getHours()
      const load  = hour >= 8 && hour <= 20 ? 0.4 + 0.5 * Math.sin(Math.PI * (hour - 8) / 12) : 0.1
      const entry: { time: string; [k: string]: number | string } = {
        time: `${String(hour).padStart(2, '0')}:00`,
      }
      this.branches.forEach((b, idx) => {
        const base = [42, 31, 59, 53, 30, 25][idx]
        entry[b.id] = +clamp(gauss(base * load + 3, 1.5), 1, 100).toFixed(1)
      })
      this.btuHistory.push(entry)
    }
  }

  startTicking() {
    this._interval = setInterval(action(() => this._tick()), 5000)
  }
  stopTicking() { if (this._interval) clearInterval(this._interval) }

  private _tick() {
    for (const b of this.branches) {
      // Keep seeded anomalies stable for demo clarity
      if (b.id === 'br-3') {
        b.supplyTempC = clamp(gauss(7.2, 0.05), 6.8, 7.6)
        b.returnTempC = clamp(gauss(10.3, 0.08), 9.8, 11.0)
        b.flowM3h     = clamp(gauss(1.45, 0.05), 1.2, 1.7)
      } else if (b.id === 'br-2' || b.id === 'br-4') {
        b.supplyTempC = clamp(gauss(b.supplyTempC, 0.08), 8.0, 10.0)
        b.returnTempC = clamp(gauss(b.returnTempC, 0.1),  12, 15)
        b.flowM3h     = clamp(gauss(b.flowM3h, 0.03), 0.4, 0.9)
      } else {
        b.supplyTempC = clamp(gauss(b.supplyTempC, 0.05), 6.0, 8.5)
        b.returnTempC = clamp(gauss(b.returnTempC, 0.08), 11, 14)
        b.flowM3h     = clamp(gauss(b.flowM3h, 0.02), 0.3, 1.0)
      }
      b.deltaT  = +(b.returnTempC - b.supplyTempC).toFixed(1)
      b.btuKw   = +calcBtuKw(b.flowM3h, b.supplyTempC, b.returnTempC).toFixed(1)
      b.btuKwhToday += b.btuKw * 5 / 3600
      b.billingMtdSgd = b.btuKwhMtd * b.billingRateSgd
    }
  }
}
