import { makeAutoObservable, action } from 'mobx'
import { type Finding, SEVERITY_ORDER } from '../types/fdd'

// Daikin Modbus mapped points per unit
// 32005 = Room Temp | 32003 = Setpoint | 32001 = Status bits | 32002 = Mode/Filter bits
// 33601 = Error code | 33602 = Error/Alarm/Warning bits | 30006 = Comm health
export interface VRVUnit {
  id: string
  unitId: string        // e.g. "VRV-01"
  room: string          // e.g. "Banking Hall"
  // 32001 bit0
  running: boolean
  // 32005 — actual room temperature (×10 in Modbus)
  roomTempC: number
  // 32003 — current active setpoint (×10 in Modbus)
  setpointC: number
  // 32002 bits 12–10 — actual running mode
  mode: 'cool' | 'fan' | 'auto' | 'dry'
  // 42001 bits 14–12 — fan speed steps 0–5
  fanSpeed: number
  // 32001 bit7 — Thermo-On = unit is actively cooling (room above SP)
  thermostatOn: boolean
  // 32002 bit7 — filter maintenance alert
  filterSign: boolean
  // 33601 — "00" = Normal
  errorCode: string
  // 33602 bit8/9/10
  hasError: boolean
  hasAlarm: boolean
  hasWarning: boolean
  // 32001 bit2 — BMS has forced this unit off
  forcedOff: boolean
  // 30006 bitfield — comm error from gateway
  commError: boolean
  // Derived tracking
  runHoursToday: number
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}
function gauss(mean: number, std: number) {
  const u = 1 - Math.random(), v = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export class VRVStore {
  units: VRVUnit[] = [
    {
      id: 'vrv-01', unitId: 'VRV-01', room: 'Banking Hall',
      running: true, roomTempC: 23.8, setpointC: 24.0,
      mode: 'cool', fanSpeed: 3, thermostatOn: false,
      filterSign: false, errorCode: '00', hasError: false, hasAlarm: false, hasWarning: false,
      forcedOff: false, commError: false, runHoursToday: 6.2,
    },
    {
      id: 'vrv-02', unitId: 'VRV-02', room: 'Customer Service Area',
      running: true, roomTempC: 25.1, setpointC: 24.0,
      mode: 'cool', fanSpeed: 4, thermostatOn: true,
      filterSign: false, errorCode: '00', hasError: false, hasAlarm: false, hasWarning: false,
      forcedOff: false, commError: false, runHoursToday: 6.2,
    },
    {
      id: 'vrv-03', unitId: 'VRV-03', room: "Manager's Office",
      running: true, roomTempC: 22.4, setpointC: 22.0,
      mode: 'cool', fanSpeed: 2, thermostatOn: false,
      filterSign: false,
      errorCode: '00', hasError: false, hasAlarm: false, hasWarning: false,
      forcedOff: false, commError: false, runHoursToday: 6.2,
    },
    {
      id: 'vrv-04', unitId: 'VRV-04', room: 'Interview Room',
      running: false, roomTempC: 27.3, setpointC: 23.0,
      mode: 'fan', fanSpeed: 0, thermostatOn: false,
      filterSign: false, errorCode: '00', hasError: false, hasAlarm: false, hasWarning: false,
      forcedOff: false, commError: false, runHoursToday: 1.1,
    },
    {
      id: 'vrv-05', unitId: 'VRV-05', room: 'Server / IT Room',
      running: true, roomTempC: 22.6, setpointC: 23.0,
      mode: 'cool', fanSpeed: 4, thermostatOn: false,
      filterSign: false, errorCode: '00',
      hasError: false, hasAlarm: false, hasWarning: false,
      forcedOff: false, commError: false, runHoursToday: 6.2,
    },
    {
      id: 'vrv-06', unitId: 'VRV-06', room: 'Staff Back Office',
      running: true, roomTempC: 23.1, setpointC: 23.0,
      mode: 'cool', fanSpeed: 2, thermostatOn: false,
      filterSign: false, errorCode: '00', hasError: false, hasAlarm: false, hasWarning: false,
      forcedOff: false, commError: false, runHoursToday: 6.2,
    },
  ]

  tempHistory: { time: string; [unitId: string]: number | string }[] = []
  energyHistory: { time: string; baseline: number; actual: number }[] = []

  private _interval: ReturnType<typeof setInterval> | null = null

  constructor() {
    makeAutoObservable(this)
    this._initHistory()
    this._initEnergyHistory()
    this.startTicking()
  }

  // ─── FDD computed ─────────────────────────────────────────────────────────

  get allFindings(): Finding[] {
    const out: Finding[] = []
    for (const u of this.units) {
      out.push(...this._findingsFor(u))
    }
    return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  }

  unitHealth(u: VRVUnit): 'ok' | 'warning' | 'critical' {
    const f = this._findingsFor(u)
    if (f.some(x => x.severity === 'critical')) return 'critical'
    if (f.some(x => x.severity === 'warning'))  return 'warning'
    return 'ok'
  }

  private _findingsFor(u: VRVUnit): Finding[] {
    const f: Finding[] = []

    // FDD-VRV-C1 — Communication loss (first; all others are unreliable if comms down)
    if (u.commError) {
      f.push({
        ruleId: 'FDD-VRV-C1', severity: 'critical', unit: u.room,
        title: 'Communication lost with controller',
        detail: `Gateway reports no Modbus response from ${u.unitId} (register 30006 bit set). Unit status is unknown — it may be running uncontrolled.`,
        recommendation: 'Check RS485 wiring at the Daikin Modbus card, verify gateway health, restart BMS gateway if needed.',
        triggerValue: 'COMM ERR',
      })
      return f
    }

    // FDD-VRV-E1 — Error code / fault
    if (u.hasError || u.errorCode !== '00') {
      f.push({
        ruleId: 'FDD-VRV-E1', severity: 'critical', unit: u.room,
        title: `Unit fault — error code ${u.errorCode}`,
        detail: `${u.unitId} reports a hardware fault (Error/Alarm register 33602 bit8 set). Error code "${u.errorCode}" is logged on the Modbus card. The unit may not be providing cooling.`,
        recommendation: `Contact Daikin service. Quote error code "${u.errorCode}" — refer to Daikin fault reference guide. Do not reset without identifying root cause.`,
        triggerValue: `ERR ${u.errorCode}`,
      })
    }

    // FDD-VRV-T1 — Temperature deviation
    const dev = u.roomTempC - u.setpointC
    if (u.running && dev > 3.0) {
      f.push({
        ruleId: 'FDD-VRV-T1', severity: 'critical', unit: u.room,
        title: `Severe cooling deficit — ${dev.toFixed(1)}°C above setpoint`,
        detail: `Room at ${u.roomTempC.toFixed(1)}°C against setpoint ${u.setpointC.toFixed(1)}°C. Thermostat-On flag is active (register 32001 bit7) — the unit is running at full compressor effort but cannot cool the space. This indicates insufficient capacity, refrigerant fault, or blocked airflow.`,
        recommendation: 'Inspect immediately: check refrigerant charge, evaporator coil cleanliness, and supply air grille obstruction. If ΔT across indoor coil is <4°C, refrigerant loss is likely. Escalate to HVAC technician.',
        triggerValue: `+${dev.toFixed(1)}°C`,
      })
    } else if (u.running && dev > 1.5) {
      f.push({
        ruleId: 'FDD-VRV-T1', severity: 'warning', unit: u.room,
        title: `Room temperature above setpoint`,
        detail: `${u.room}: ${u.roomTempC.toFixed(1)}°C vs setpoint ${u.setpointC.toFixed(1)}°C. Unit is actively cooling (Thermo-On). Monitor for recovery within 15 minutes.`,
        recommendation: 'If not recovering within 15 min, inspect filter and airflow. Check for door/window left open.',
        triggerValue: `+${dev.toFixed(1)}°C`,
      })
    }

    // FDD-VRV-F1 — Filter alert
    if (u.filterSign) {
      f.push({
        ruleId: 'FDD-VRV-F1', severity: 'warning', unit: u.room,
        title: 'Filter maintenance required',
        detail: `${u.unitId} filter alert bit is set (register 32002 bit7 = 1). A dirty filter restricts airflow across the evaporator coil, reducing cooling capacity and increasing energy consumption by up to 15%. Sustained operation accelerates coil icing risk.`,
        recommendation: "Schedule filter cleaning or replacement within 5 business days. Clean filters every 3 months in Singapore's tropical climate. Reset filter sign after service (write 15 then 0 to register 42002 bits 15–8).",
        triggerValue: 'Filter Alert',
      })
    }

    // FDD-VRV-SP — Setpoint too low (overcooling)
    if (u.running && u.setpointC < 20) {
      f.push({
        ruleId: 'FDD-VRV-SP', severity: 'info', unit: u.room,
        title: 'Setpoint below recommended minimum',
        detail: `${u.room} setpoint is ${u.setpointC.toFixed(1)}°C. Below 22°C provides minimal additional comfort benefit while significantly increasing compressor loading and energy cost.`,
        recommendation: 'Raise setpoint to 22–24°C. Each 1°C increase above 24°C saves approximately 6% in compressor energy. Consider enabling setpoint lock (register 42801 bit2) to prevent occupant over-cooling.',
        triggerValue: `${u.setpointC.toFixed(1)}°C SP`,
      })
    }

    // FDD-VRV-FO — Forced off during business hours
    const hour = new Date().getHours()
    if (u.forcedOff && hour >= 8 && hour < 20) {
      f.push({
        ruleId: 'FDD-VRV-FO', severity: 'warning', unit: u.room,
        title: 'Unit forced off during operating hours',
        detail: `${u.unitId} in ${u.room} has been force-switched off via BMS (register 32001 bit2 = 1) during standard operating hours (08:00–20:00).`,
        recommendation: 'Confirm if this is intentional (maintenance override or emergency). If unintended, restore via BMS Global Control (register 41001 bit0) or local unit.',
        triggerValue: 'Forced Off',
      })
    }

    // FDD-VRV-OC — Unit off but room temperature elevated during business hours
    if (!u.running && u.roomTempC > u.setpointC + 2.0 && hour >= 8 && hour < 20) {
      f.push({
        ruleId: 'FDD-VRV-OC', severity: 'info', unit: u.room,
        title: 'Unoccupied room temperature elevated',
        detail: `${u.unitId} (${u.room}) is switched off but the room sensor reads ${u.roomTempC.toFixed(1)}°C — ${(u.roomTempC - u.setpointC).toFixed(1)}°C above the ${u.setpointC.toFixed(1)}°C setpoint. This can occur after extended vacancy post-occupancy, or if a scheduled pre-cool cycle has not yet started. Error register 33601 reads "00" (no hardware fault).`,
        recommendation: 'If the room will be occupied within 2 hours, initiate a 15-minute pre-cool via BMS schedule (register 41003). Consider enabling occupancy-linked auto-start to automate pre-cooling. This advisory is suppressed outside operating hours.',
        triggerValue: `+${(u.roomTempC - u.setpointC).toFixed(1)}°C (off)`,
      })
    }

    // FDD-VRV-EFF — Fan running at High speed — efficiency advisory
    if (u.running && u.fanSpeed >= 4) {
      f.push({
        ruleId: 'FDD-VRV-EFF', severity: 'info', unit: u.room,
        title: 'Fan speed at High — efficiency advisory',
        detail: `${u.unitId} (${u.room}) is running at fan speed ${u.fanSpeed} (High, register 42001 bits 12–14). Unless the space requires rapid cool-down recovery, sustained high-speed fan operation increases acoustic levels and fan motor wear without proportional cooling benefit over Auto mode. Error register 33601 is clear (00).`,
        recommendation: 'If room temperature is within 1°C of setpoint, switch to Auto fan mode (write 0 to register 42001 bits 12–14 via BMS). Auto mode can reduce fan energy by 30–40% while maintaining occupant comfort. Review fan scheduling in the BMS programme.',
        triggerValue: `Fan ${u.fanSpeed}/5`,
      })
    }

    return f
  }

  // ─── Control actions ──────────────────────────────────────────────────────

  setSetpoint(unitId: string, temp: number) {
    const u = this.units.find(x => x.unitId === unitId)
    if (u) u.setpointC = Math.max(16, Math.min(30, +temp.toFixed(1)))
  }

  setMode(unitId: string, mode: 'cool' | 'fan' | 'auto' | 'dry') {
    const u = this.units.find(x => x.unitId === unitId)
    if (u) u.mode = mode
  }

  setFanSpeed(unitId: string, speed: number) {
    const u = this.units.find(x => x.unitId === unitId)
    if (u) u.fanSpeed = Math.max(0, Math.min(5, speed))
  }

  toggleRunning(unitId: string) {
    const u = this.units.find(x => x.unitId === unitId)
    if (u) u.running = !u.running
  }

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  get unitsRunning() { return this.units.filter(u => u.running).length }
  get unitsCritical() { return this.units.filter(u => this.unitHealth(u) === 'critical').length }
  get unitsWarning()  { return this.units.filter(u => this.unitHealth(u) === 'warning').length }
  get avgRoomTemp() {
    const running = this.units.filter(u => u.running)
    return running.reduce((s, u) => s + u.roomTempC, 0) / (running.length || 1)
  }

  // Energy baseline vs optimised (24-h rolling)
  get totalKwhBaseline()  { return Math.round(this.energyHistory.reduce((s, h) => s + h.baseline, 0)) }
  get totalKwhOptimised() { return Math.round(this.energyHistory.reduce((s, h) => s + h.actual,   0)) }
  get totalKwhSaved()     { return Math.max(0, this.totalKwhBaseline - this.totalKwhOptimised) }

  // ─── History (24-point hourly for room temp trend chart) ─────────────────

  private _initHistory() {
    const now = new Date()
    const ids = this.units.map(u => u.unitId)
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3_600_000)
      const hour = t.getHours()
      const entry: { time: string; [k: string]: number | string } = {
        time: `${String(hour).padStart(2, '0')}:00`,
      }
      this.units.forEach(u => {
        const base = hour >= 8 && hour <= 20
          ? u.setpointC + (u.id === 'vrv-05' ? 4 + Math.random() * 3 : Math.random() * 1.5 - 0.5)
          : u.setpointC - 1 + Math.random()
        entry[u.unitId] = +clamp(base, 18, 32).toFixed(1)
      })
      this.tempHistory.push(entry)
    }
  }

  private _initEnergyHistory() {
    const now = new Date()
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3_600_000)
      const h = t.getHours()
      let actualKw: number
      if (h >= 0 && h < 7) {
        actualKw = 0.5 + Math.random() * 0.2          // off-hours: server room + standby
      } else if (h === 7) {
        actualKw = 1.2 + Math.random() * 0.4           // early morning startup
      } else if (h === 8) {
        actualKw = 3.2 + Math.random() * 0.6           // pre-work ramp
      } else if (h >= 9 && h < 12) {
        actualKw = 5.2 + 0.8 * Math.sin((h - 9) / 3 * Math.PI) + (Math.random() - 0.5) * 0.4
      } else if (h >= 12 && h < 14) {
        actualKw = 4.8 + (Math.random() - 0.5) * 0.4  // midday dip
      } else if (h >= 14 && h < 18) {
        actualKw = 5.4 + (Math.random() - 0.5) * 0.4  // afternoon peak
      } else if (h === 18) {
        actualKw = 4.2 + (Math.random() - 0.5) * 0.3
      } else if (h === 19) {
        actualKw = 3.0 + (Math.random() - 0.5) * 0.3
      } else if (h === 20) {
        actualKw = 1.8 + Math.random() * 0.2
      } else if (h === 21) {
        actualKw = 1.0 + Math.random() * 0.2
      } else {
        actualKw = 0.6 + Math.random() * 0.2           // 22-23 (server room)
      }
      // Baseline = pre-optimisation (no schedule, no setback, ~18-22% higher)
      const baseline = +(actualKw * (1.18 + Math.random() * 0.04)).toFixed(2)
      this.energyHistory.push({
        time: `${String(h).padStart(2, '0')}:00`,
        baseline: Math.max(0.1, baseline),
        actual:   Math.max(0.1, +actualKw.toFixed(2)),
      })
    }
  }

  startTicking() {
    this._interval = setInterval(action(() => this._tick()), 5000)
  }
  stopTicking() { if (this._interval) clearInterval(this._interval) }

  private _tick() {
    for (const u of this.units) {
      if (!u.running) continue
      u.roomTempC = clamp(gauss(u.roomTempC, 0.08), u.setpointC - 1, u.setpointC + 2.5)
      u.thermostatOn = u.roomTempC > u.setpointC + 0.3
      u.runHoursToday += 5 / 3600
    }
  }
}
