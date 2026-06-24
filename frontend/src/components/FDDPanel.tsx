import React, { useState } from 'react'
import { Tag, Button, Space } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { type Finding, SEVERITY_STYLE } from '../types/fdd'

const ICON = {
  critical: <CloseCircleOutlined style={{ color: '#cf1322' }} />,
  warning:  <ExclamationCircleOutlined style={{ color: '#d48806' }} />,
  info:     <InfoCircleOutlined style={{ color: '#096dd9' }} />,
}

function FindingRow({ f }: { f: Finding }) {
  const [expanded, setExpanded] = useState(false)
  const s = SEVERITY_STYLE[f.severity]

  // One-line action summary (first sentence of recommendation)
  const actionSummary = f.recommendation.split('. ')[0] + '.'

  return (
    <div
      style={{
        borderLeft: `3px solid ${s.borderColor}`,
        background: s.bg,
        borderRadius: '0 4px 4px 0',
        padding: '6px 10px',
        marginBottom: 6,
      }}
    >
      {/* Summary row — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {ICON[f.severity]}
        <Tag color={s.tagColor} style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>
          {f.severity.toUpperCase()}
        </Tag>
        <span style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', flexShrink: 0 }}>
          {f.ruleId}
        </span>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>
          {f.title}
        </span>
        <span style={{ fontSize: 11, color: '#595959', flexShrink: 0 }}>{f.unit}</span>
        <span style={{ fontSize: 11, color: '#aaa', flexShrink: 0 }}>| {f.triggerValue}</span>
        <Button
          type="link" size="small"
          style={{ padding: '0 2px', fontSize: 11, height: 'auto', flexShrink: 0 }}
          icon={expanded ? <UpOutlined style={{ fontSize: 9 }} /> : <DownOutlined style={{ fontSize: 9 }} />}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? 'Less' : 'Detail'}
        </Button>
      </div>

      {/* Collapsed: one-line action hint */}
      {!expanded && (
        <div style={{ fontSize: 11, color: '#595959', marginTop: 2, paddingLeft: 22, opacity: 0.85 }}>
          → {actionSummary}
        </div>
      )}

      {/* Expanded: full detail + recommendation */}
      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 22 }}>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 6px', lineHeight: 1.6 }}>
            {f.detail}
          </p>
          <p style={{ fontSize: 12, margin: 0 }}>
            <span style={{ color: '#096dd9', fontWeight: 500 }}>Action: </span>
            <span style={{ color: '#595959' }}>{f.recommendation}</span>
          </p>
        </div>
      )}
    </div>
  )
}

interface Props {
  findings: Finding[]
  systemLabel?: string
}

export function FDDPanel({ findings, systemLabel }: Props) {
  if (findings.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#f6ffed', border: '1px solid #b7eb8f',
        borderRadius: 6, padding: '10px 14px',
      }}>
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        <div>
          <span style={{ fontWeight: 600, color: '#389e0d' }}>All Clear</span>
          <span style={{ fontSize: 12, color: '#888', display: 'block' }}>
            No faults detected{systemLabel ? ` for ${systemLabel}` : ''}. All parameters within bounds.
          </span>
        </div>
      </div>
    )
  }

  const critical = findings.filter(f => f.severity === 'critical').length
  const warnings = findings.filter(f => f.severity === 'warning').length
  const infos    = findings.filter(f => f.severity === 'info').length

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        {critical > 0 && (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            {critical} Critical
          </Tag>
        )}
        {warnings > 0 && (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>
            {warnings} Warning{warnings > 1 ? 's' : ''}
          </Tag>
        )}
        {infos > 0 && (
          <Tag color="processing" icon={<InfoCircleOutlined />}>
            {infos} Advisory
          </Tag>
        )}
      </Space>
      {findings.map((f, idx) => (
        <FindingRow key={`${f.ruleId}-${f.unit}-${idx}`} f={f} />
      ))}
    </div>
  )
}
