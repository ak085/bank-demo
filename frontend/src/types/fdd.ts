export type Severity = 'critical' | 'warning' | 'info'

export interface Finding {
  ruleId: string
  severity: Severity
  unit: string         // room / zone / branch name
  title: string
  detail: string
  recommendation: string
  triggerValue: string
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export const SEVERITY_STYLE = {
  critical: { borderColor: '#cf1322', bg: '#fff1f0', tagColor: 'error'    as const },
  warning:  { borderColor: '#d48806', bg: '#fffbe6', tagColor: 'warning'  as const },
  info:     { borderColor: '#096dd9', bg: '#e6f4ff', tagColor: 'processing' as const },
}

export function overallHealth(findings: Finding[]): 'ok' | 'warning' | 'critical' {
  if (findings.some(f => f.severity === 'critical')) return 'critical'
  if (findings.some(f => f.severity === 'warning'))  return 'warning'
  return 'ok'
}
