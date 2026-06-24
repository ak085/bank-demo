import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  Card, Row, Col, Table, Tag, Statistic, Typography, Divider, Badge, Progress,
  Tabs, InputNumber, Button, message, Switch, Form, Input, List, Avatar, Select, Segmented,
} from 'antd'
import {
  AreaChartOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  AppstoreOutlined, ControlOutlined, BellOutlined, SettingOutlined,
  MailOutlined, PhoneOutlined, UserOutlined, RobotOutlined, DeleteOutlined,
  TableOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../stores'
import { FDDPanel } from '../components/FDDPanel'
import type { Branch } from '../stores/BTUStore'

const { Title, Text } = Typography

function HealthTag({ health }: { health: 'ok' | 'warning' | 'critical' }) {
  if (health === 'critical') return <Tag color="error" icon={<CloseCircleOutlined />}>FAULT</Tag>
  if (health === 'warning')  return <Tag color="warning" icon={<ExclamationCircleOutlined />}>WARNING</Tag>
  return <Tag color="success" icon={<CheckCircleOutlined />}>Normal</Tag>
}

function deltaTColor(dt: number) {
  if (dt < 3.5) return '#cf1322'
  if (dt < 4.5) return '#d48806'
  return '#389e0d'
}
function deviationColor(pct: number) {
  if (Math.abs(pct) > 15) return pct > 0 ? '#cf1322' : '#096dd9'
  if (Math.abs(pct) > 10) return '#d48806'
  return '#389e0d'
}

function SettingsTab({ findingsCount }: { findingsCount: number }) {
  const [contacts, setContacts] = useState([
    { key: '1', name: 'Facilities Manager', email: 'facilities@dbs.com.sg', phone: '+65 9111 2345', severity: 'warning', enabled: true },
    { key: '2', name: 'Finance / Cost Controller', email: 'finance@dbs.com.sg', phone: '+65 8444 5678', severity: 'warning', enabled: true },
  ])
  const [form] = Form.useForm()

  function addContact(values: { name: string; email: string; phone: string; severity: string }) {
    setContacts(c => [...c, { key: Date.now().toString(), enabled: true, ...values }])
    form.resetFields()
    message.success('Contact added')
  }

  const algorithms = [
    { rule: 'FDD-BTU-DT1', condition: 'ΔT < warning threshold (default 4.5°C)', severity: 'Warning; Critical if < 3.5°C', action: 'Inspect bypass valve & control valves' },
    { rule: 'FDD-BTU-ST1', condition: 'Supply temp > high threshold (default 8.5°C)', severity: 'Warning', action: 'Alert chilled water plant operator' },
    { rule: 'FDD-BTU-ST2', condition: 'Supply temp < low threshold (default 5.5°C)', severity: 'Advisory', action: 'Check pipe insulation, notify plant ops' },
    { rule: 'FDD-BTU-BD1', condition: 'MTD consumption > billing deviation % above expected', severity: 'Warning / Advisory', action: 'Cross-check with ΔT; fix valve or verify load increase' },
    { rule: 'FDD-BTU-AH1', condition: 'After-hours kWh > threshold (default 2.0 kWh)', severity: 'Advisory', action: 'Verify AHU/FCU shutdowns at branch closing time' },
  ]

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card
          title={<><RobotOutlined style={{ marginRight: 6, color: '#096dd9' }} />System Monitor — BTU</>}
          size="small"
          extra={<Tag color="success">Active</Tag>}
        >
          <Row gutter={24}>
            <Col span={6}><Statistic title="Evaluation Cycle" value={5} suffix="s" /></Col>
            <Col span={6}><Statistic title="FDD Rules Loaded" value={5} /></Col>
            <Col span={6}><Statistic title="Active Findings" value={findingsCount} /></Col>
            <Col span={6}><Statistic title="Points / Branch" value={3} suffix="(Flow+Sup+Ret)" /></Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            The <strong>BTU Monitor</strong> reads chilled water flow, supply temperature, and return
            temperature for each branch every 5 seconds. It calculates real-time BTU demand (kW)
            and month-to-date consumption (kWh), comparing against expected billing baselines.
            Low ΔT detection identifies chilled water waste — excess flow at low ΔT raises pump
            energy across the entire district cooling network, not just this branch.
            Alert thresholds are configurable from the Thresholds tab.
          </Text>
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Algorithm & Rule Reference" size="small">
          <Table
            dataSource={algorithms}
            size="small"
            pagination={false}
            rowKey="rule"
            columns={[
              { title: 'Rule ID', dataIndex: 'rule', key: 'rule', width: 120, render: (v: string) => <code>{v}</code> },
              { title: 'Trigger Condition', dataIndex: 'condition', key: 'cond' },
              { title: 'Severity', dataIndex: 'severity', key: 'sev', width: 160 },
              { title: 'Recommended Action', dataIndex: 'action', key: 'act' },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
            BTU formula: kW = (Flow m³/h ÷ 3.6) × 4.186 kJ/(kg·K) × ΔT.
            Billing rate: SGD 0.088/kWh thermal. Target ΔT ≥ 5°C per ASHRAE chilled water guidelines.
          </Text>
        </Card>
      </Col>

      <Col span={14}>
        <Card title="Alarm Notification Contacts" size="small">
          <List
            dataSource={contacts}
            renderItem={c => (
              <List.Item
                actions={[
                  <Switch key="sw" size="small" checked={c.enabled}
                    onChange={en => setContacts(cs => cs.map(x => x.key === c.key ? { ...x, enabled: en } : x))} />,
                  <Button key="del" type="link" danger size="small" icon={<DeleteOutlined />}
                    onClick={() => setContacts(cs => cs.filter(x => x.key !== c.key))} />,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} size="small" />}
                  title={<span style={{ fontSize: 13 }}>{c.name} <Tag style={{ fontSize: 10 }}>{c.severity}</Tag></span>}
                  description={
                    <span style={{ fontSize: 11 }}>
                      <MailOutlined style={{ marginRight: 4 }} />{c.email}
                      &nbsp;&nbsp;<PhoneOutlined style={{ marginRight: 4 }} />{c.phone}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col span={10}>
        <Card title="Add Contact" size="small">
          <Form form={form} layout="vertical" size="small" onFinish={addContact}>
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
              <Input placeholder="Full name" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="name@dbs.com.sg" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+65 9XXX XXXX" />
            </Form.Item>
            <Form.Item name="severity" label="Notify on" initialValue="warning">
              <Select options={[
                { value: 'critical', label: 'Critical only' },
                { value: 'warning', label: 'Warning & above' },
                { value: 'info', label: 'All findings' },
              ]} />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="small" block>Add Contact</Button>
          </Form>
        </Card>
      </Col>
    </Row>
  )
}

// ─── Point list tab ────────────────────────────────────────────────────────
interface PointRow {
  key: string; pointId: string; name: string; desc: string
  access: 'R' | 'Derived'; unit: string
  value: string | number; status: 'normal' | 'warning' | 'critical'
}

const BTUPointsTab = observer(function BTUPointsTab() {
  const { btu } = useStore()
  const [selId, setSelId] = useState('br-amk')
  const b = btu.branches.find(x => x.id === selId) ?? btu.branches[0]
  const health = btu.branchHealth(b)

  const dtSt: PointRow['status']  = b.deltaT < btu.deltaTCritical ? 'critical' : b.deltaT < btu.deltaTWarning ? 'warning' : 'normal'
  const supSt: PointRow['status'] = b.supplyTempC > btu.supplyTempHigh ? 'warning' : b.supplyTempC < btu.supplyTempLow ? 'warning' : 'normal'
  const devSt: PointRow['status'] = b.mtdDeviationPct > btu.billingDeviation ? 'warning' : b.mtdDeviationPct > 10 ? 'warning' : 'normal'
  const ahSt: PointRow['status']  = b.afterHoursKwhToday > btu.afterHoursKwh ? 'warning' : 'normal'

  const points: PointRow[] = [
    { key: 'flow',   pointId: 'flow_m3h',           name: 'Flow Rate',         desc: 'Chilled water volumetric flow rate from ultrasonic meter',                 access: 'R',       unit: 'm³/h',   value: b.flowM3h.toFixed(2),              status: 'normal' },
    { key: 'sup',    pointId: 'supply_temp_c',       name: 'Supply Temperature',desc: 'Chilled water temperature at branch inlet (from central plant)',           access: 'R',       unit: '°C',     value: b.supplyTempC.toFixed(1),          status: supSt    },
    { key: 'ret',    pointId: 'return_temp_c',       name: 'Return Temperature',desc: 'Chilled water temperature leaving the branch AHU/FCU coils',               access: 'R',       unit: '°C',     value: b.returnTempC.toFixed(1),          status: 'normal' },
    { key: 'dt',     pointId: 'delta_t',             name: 'ΔT',                desc: 'Return − Supply temp: heat absorbed by chilled water (target ≥ 5°C)',      access: 'Derived', unit: '°C',     value: b.deltaT.toFixed(1),               status: dtSt     },
    { key: 'bkw',    pointId: 'btu_kw',              name: 'BTU Demand',        desc: 'Thermal power = (Flow ÷ 3.6) × 4.186 × ΔT kW',                           access: 'Derived', unit: 'kW',     value: b.btuKw.toFixed(1),                status: 'normal' },
    { key: 'kwht',   pointId: 'btu_kwh_today',       name: "Today's kWh",       desc: 'Running daily thermal energy accumulator since midnight',                  access: 'R',       unit: 'kWh',    value: b.btuKwhToday.toFixed(0),          status: 'normal' },
    { key: 'ahkwh',  pointId: 'after_hours_kwh',     name: 'After-Hours kWh',   desc: 'Consumption outside 08:00–20:00 today (potential waste)',                  access: 'Derived', unit: 'kWh',    value: b.afterHoursKwhToday.toFixed(1),   status: ahSt     },
    { key: 'mtd',    pointId: 'btu_kwh_mtd',         name: 'MTD Consumption',   desc: 'Month-to-date thermal energy (billing basis)',                             access: 'R',       unit: 'kWh',    value: b.btuKwhMtd.toFixed(0),            status: 'normal' },
    { key: 'mtdexp', pointId: 'btu_kwh_mtd_expected',name: 'Expected MTD',      desc: 'Historical daily average × days elapsed this month',                      access: 'Derived', unit: 'kWh',    value: b.btuKwhMtdExpected.toFixed(0),    status: 'normal' },
    { key: 'dev',    pointId: 'mtd_deviation_pct',   name: 'MTD Deviation',     desc: 'MTD vs expected — positive = over-budget (FDD-BTU-BD1 input)',             access: 'Derived', unit: '%',      value: (b.mtdDeviationPct > 0 ? '+' : '') + b.mtdDeviationPct.toFixed(1), status: devSt },
    { key: 'bill',   pointId: 'billing_mtd_sgd',     name: 'MTD Bill',          desc: 'MTD kWh × billing rate (SGD)',                                             access: 'Derived', unit: 'SGD',    value: '$' + b.billingMtdSgd.toFixed(0),  status: 'normal' },
    { key: 'rate',   pointId: 'billing_rate_sgd',    name: 'Billing Rate',      desc: 'Chilled water tariff — SGD per kWh thermal (district cooling)',            access: 'R',       unit: 'SGD/kWh',value: b.billingRateSgd.toFixed(3),       status: 'normal' },
  ]

  const cols = [
    { title: 'Channel / Field',  dataIndex: 'pointId', key: 'pid',  width: 200,
      render: (v: string) => <code style={{ fontSize: 11, color: '#595959' }}>{v}</code> },
    { title: 'Name',             dataIndex: 'name',    key: 'name', width: 170 },
    { title: 'Description',      dataIndex: 'desc',    key: 'desc' },
    { title: 'Access', dataIndex: 'access', key: 'acc', width: 80,
      render: (v: string) => (
        <Tag color={v === 'Derived' ? 'purple' : 'default'}
          style={{ fontSize: 10, margin: 0 }}>{v}</Tag>
      ) },
    { title: 'Unit',             dataIndex: 'unit',    key: 'unit', width: 90,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
    { title: 'Live Value', key: 'val', width: 120,
      render: (_: unknown, row: PointRow) => {
        const color = row.status === 'critical' ? '#cf1322' : row.status === 'warning' ? '#d48806' : '#389e0d'
        return <Text strong style={{ color, fontFamily: 'monospace', fontSize: 13 }}>{row.value}</Text>
      } },
    { title: 'Status', key: 'st', width: 80,
      render: (_: unknown, row: PointRow) => {
        if (row.status === 'critical') return <Tag color="error"   style={{ fontSize: 10 }}>Fault</Tag>
        if (row.status === 'warning')  return <Tag color="warning" style={{ fontSize: 10 }}>Alert</Tag>
        return                                <Tag color="success" style={{ fontSize: 10 }}>OK</Tag>
      } },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 12 }}>Branch:</Text>
        <Segmented
          size="small"
          options={btu.branches.map(x => ({
            label: (
              <span>
                {x.name.replace('DBS ', '')}
                {btu.branchHealth(x) === 'critical' && <span style={{ color: '#cf1322', marginLeft: 3 }}>●</span>}
                {btu.branchHealth(x) === 'warning'  && <span style={{ color: '#d48806', marginLeft: 3 }}>●</span>}
              </span>
            ),
            value: x.id,
          }))}
          value={selId}
          onChange={v => setSelId(v as string)}
        />
        <Tag color={health === 'critical' ? 'error' : health === 'warning' ? 'warning' : 'success'}
          style={{ marginLeft: 'auto' }}>
          {b.name}
        </Tag>
      </div>
      <Table<PointRow>
        dataSource={points} columns={cols} rowKey="key"
        pagination={false} size="small" scroll={{ x: 'max-content' }}
        rowClassName={(r) => r.status === 'critical' ? 'row-critical' : r.status === 'warning' ? 'row-warning' : ''}
      />
      <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
        <Tag color="default" style={{ fontSize: 10 }}>R</Tag> Measured sensor value &nbsp;
        <Tag color="purple"  style={{ fontSize: 10 }}>Derived</Tag> Calculated from raw meter readings &nbsp;|&nbsp;
        BTU = (Flow m³/h ÷ 3.6) × 4.186 kJ/(kg·K) × ΔT · Rate: SGD 0.088/kWh · refreshes every 5 s
      </div>
    </div>
  )
})

const BTUPage: React.FC = observer(() => {
  const { btu, darkMode } = useStore()

  const overallHealth = btu.allFindings.some(f => f.severity === 'critical') ? 'critical'
    : btu.allFindings.some(f => f.severity === 'warning') ? 'warning' : 'ok'
  const critWarnCount = btu.allFindings.filter(f => f.severity !== 'info').length

  // Billing cycle progress
  const dayOfMonth  = new Date().getDate()
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100)

  // ΔT bar chart (horizontal)
  const deltaTOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (p: { name: string; value: number }[]) =>
        `${p[0].name}: ΔT = ${p[0].value}°C (target ≥ 5.0°C)`,
    },
    grid: { left: 130, right: 60, top: 20, bottom: 20 },
    xAxis: { type: 'value' as const, name: 'ΔT (°C)', min: 0, max: 8 },
    yAxis: {
      type: 'category' as const,
      data: btu.branches.map(b => b.name.replace('DBS ', '')),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      name: 'ΔT (°C)', type: 'bar' as const,
      data: btu.branches.map(b => b.deltaT),
      itemStyle: {
        color: (p: { dataIndex: number }) => deltaTColor(btu.branches[p.dataIndex].deltaT),
      },
      label: {
        show: true, position: 'right' as const,
        formatter: (p: { value: number }) => `${p.value.toFixed(1)}°C`,
      },
      markLine: {
        data: [{ xAxis: 5, name: 'Target 5°C', lineStyle: { color: '#389e0d', type: 'dashed' as const } }],
        label: { formatter: 'Target\n5°C', color: '#389e0d' },
      },
      barMaxWidth: 22,
    }],
  }

  // MTD deviation chart (horizontal)
  const deviationOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 130, right: 60, top: 20, bottom: 20 },
    xAxis: { type: 'value' as const, name: 'MTD Deviation (%)', min: -20, max: 35 },
    yAxis: {
      type: 'category' as const,
      data: btu.branches.map(b => b.name.replace('DBS ', '')),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      name: 'MTD Deviation %', type: 'bar' as const,
      data: btu.branches.map(b => +b.mtdDeviationPct.toFixed(1)),
      itemStyle: {
        color: (p: { dataIndex: number }) => deviationColor(btu.branches[p.dataIndex].mtdDeviationPct),
      },
      label: {
        show: true, position: 'right' as const,
        formatter: (p: { value: number }) => `${p.value > 0 ? '+' : ''}${p.value.toFixed(1)}%`,
      },
      barMaxWidth: 22,
    }],
  }

  // Branch table columns
  const columns = [
    { title: 'Health', key: 'health', width: 100,
      render: (_: unknown, b: Branch) => <HealthTag health={btu.branchHealth(b)} /> },
    { title: 'Branch', dataIndex: 'name', key: 'name' },
    { title: 'Supply °C', dataIndex: 'supplyTempC', key: 'sup', width: 90,
      render: (v: number) => {
        const color = v > btu.supplyTempHigh ? '#d48806' : v < btu.supplyTempLow ? '#096dd9' : '#389e0d'
        return <Text style={{ color, fontWeight: v > btu.supplyTempHigh ? 600 : 400 }}>{v.toFixed(1)}</Text>
      } },
    { title: 'Return °C', dataIndex: 'returnTempC', key: 'ret', width: 90,
      render: (v: number) => v.toFixed(1) },
    { title: 'ΔT', dataIndex: 'deltaT', key: 'dt', width: 70,
      render: (v: number) => (
        <Text style={{ color: deltaTColor(v), fontWeight: 700 }}>{v.toFixed(1)}°C</Text>
      ) },
    { title: 'Flow (m³/h)', dataIndex: 'flowM3h', key: 'flow', width: 100,
      render: (v: number) => v.toFixed(2) },
    { title: 'BTU Now (kW)', dataIndex: 'btuKw', key: 'btu', width: 110,
      render: (v: number) => v.toFixed(1) },
    { title: 'Today (kWh)', dataIndex: 'btuKwhToday', key: 'today', width: 105,
      render: (v: number) => v.toFixed(0) },
    { title: 'Off-Hrs (kWh)', dataIndex: 'afterHoursKwhToday', key: 'ah', width: 110,
      render: (v: number) => (
        <Text style={{ color: v > btu.afterHoursKwh ? '#d48806' : '#389e0d' }}>{v.toFixed(1)}</Text>
      ) },
    { title: 'MTD kWh', dataIndex: 'btuKwhMtd', key: 'mtd', width: 95,
      render: (v: number) => v.toFixed(0) },
    { title: 'Expected MTD', dataIndex: 'btuKwhMtdExpected', key: 'exp', width: 110,
      render: (v: number) => <Text type="secondary">{v.toFixed(0)}</Text> },
    { title: 'Deviation', dataIndex: 'mtdDeviationPct', key: 'dev', width: 90,
      render: (v: number) => (
        <Text style={{ color: deviationColor(v), fontWeight: Math.abs(v) > 10 ? 600 : 400 }}>
          {v > 0 ? '+' : ''}{v.toFixed(1)}%</Text>
      ) },
    { title: 'MTD Bill (SGD)', dataIndex: 'billingMtdSgd', key: 'bill', width: 115,
      render: (v: number) => `$${v.toFixed(0)}` },
  ]

  // ── Overview tab ──────────────────────────────────────────────────────────
  const overviewContent = (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Total Demand" value={btu.totalBtuKw} suffix="kW" precision={1}
              valueStyle={{ color: '#096dd9' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Avg ΔT" value={btu.avgDeltaT} suffix="°C" precision={1}
              valueStyle={{ color: deltaTColor(btu.avgDeltaT) }} />
            <div style={{ fontSize: 11, color: '#999' }}>Target ≥ 5°C</div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Low ΔT Branches" value={btu.lowDeltaTCount}
              suffix={`/ ${btu.branches.length}`}
              valueStyle={{ color: btu.lowDeltaTCount > 0 ? '#cf1322' : '#389e0d' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Total MTD Bill" prefix="SGD" value={btu.totalMtdSgd} precision={0} />
            <div style={{ fontSize: 11, color: '#999' }}>Day {dayOfMonth} of {daysInMonth}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Billing Cycle</div>
            <Progress type="circle" percent={monthProgress} size={64}
              strokeColor={monthProgress > 75 ? '#d48806' : '#1677ff'}
              format={p => <span style={{ fontSize: 13, fontWeight: 600 }}>{p}%</span>} />
          </Card>
        </Col>
      </Row>

      {/* Energy summary — compact */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center', background: '#e6f4ff', border: '1px solid #91caff' }}>
            <Statistic title="Total kWh Today" value={+btu.totalKwhToday.toFixed(0)} suffix="kWh"
              valueStyle={{ color: '#096dd9' }} />
            <div style={{ fontSize: 11, color: '#5a8fc1', marginTop: 2 }}>All 6 branches combined</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center', background: '#e6f4ff', border: '1px solid #91caff' }}>
            <Statistic title="Today's Chilled Water Cost"
              value={`$${(btu.totalKwhToday * 0.088).toFixed(0)}`}
              valueStyle={{ color: '#096dd9' }} />
            <div style={{ fontSize: 11, color: '#5a8fc1', marginTop: 2 }}>SGD 0.088/kWh (district cooling)</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center',
            background: btu.branches.some(b => b.afterHoursKwhToday > btu.afterHoursKwh) ? '#fffbe6' : '#f6ffed',
            border: btu.branches.some(b => b.afterHoursKwhToday > btu.afterHoursKwh) ? '1px solid #ffe58f' : '1px solid #b7eb8f',
          }}>
            <Statistic title="After-Hours kWh"
              value={+(btu.branches.reduce((s, b) => s + b.afterHoursKwhToday, 0)).toFixed(1)} suffix="kWh"
              valueStyle={{ color: btu.branches.some(b => b.afterHoursKwhToday > btu.afterHoursKwh) ? '#d48806' : '#389e0d' }} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Outside 08:00–20:00</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="ΔT by Branch — Chilled Water Utilisation Efficiency" size="small">
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
              <Text style={{ color: '#cf1322', fontSize: 11 }}>Red</Text> &lt;{btu.deltaTCritical}°C critical &nbsp;
              <Text style={{ color: '#d48806', fontSize: 11 }}>Orange</Text> &lt;{btu.deltaTWarning}°C warning &nbsp;
              <Text style={{ color: '#389e0d', fontSize: 11 }}>Green</Text> ≥5°C good
            </div>
            <ReactECharts option={deltaTOption} style={{ height: 230 }} theme={darkMode ? 'dark' : undefined} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Month-to-Date Consumption vs Expected (%)" size="small">
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
              <Text style={{ color: '#cf1322', fontSize: 11 }}>Red</Text> &gt;{btu.billingDeviation}% over &nbsp;
              <Text style={{ color: '#d48806', fontSize: 11 }}>Orange</Text> 10–{btu.billingDeviation}% &nbsp;
              <Text style={{ color: '#389e0d', fontSize: 11 }}>Green</Text> within ±10%
            </div>
            <ReactECharts option={deviationOption} style={{ height: 230 }} theme={darkMode ? 'dark' : undefined} />
          </Card>
        </Col>
      </Row>

      <Card title="Branch Detail — Metering & Billing" size="small">
        <Table<Branch>
          dataSource={btu.branches}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          rowClassName={(b) => {
            const h = btu.branchHealth(b)
            if (h === 'critical') return 'row-critical'
            if (h === 'warning')  return 'row-warning'
            return ''
          }}
        />
      </Card>
    </>
  )

  // ── Control tab (threshold configuration) ─────────────────────────────────
  const [dtWarn,  setDtWarn]  = useState(btu.deltaTWarning)
  const [dtCrit,  setDtCrit]  = useState(btu.deltaTCritical)
  const [supHigh, setSupHigh] = useState(btu.supplyTempHigh)
  const [supLow,  setSupLow]  = useState(btu.supplyTempLow)
  const [billDev, setBillDev] = useState(btu.billingDeviation)
  const [ahKwh,   setAhKwh]   = useState(btu.afterHoursKwh)

  function applyThresholds() {
    btu.setDeltaTThresholds(dtWarn, dtCrit)
    btu.setSupplyTempThresholds(supHigh, supLow)
    btu.setBillingDeviation(billDev)
    btu.setAfterHoursKwh(ahKwh)
    message.success('Thresholds updated — FDD rules reapplied')
  }

  const controlContent = (
    <>
      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 4, fontSize: 12, color: '#0958d9' }}>
        <strong>Demo mode:</strong> Thresholds adjust FDD alert rules in real time. In production, saved to configuration database.
      </div>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="ΔT Alert Thresholds" size="small">
            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Warning threshold — below this ΔT triggers a warning
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InputNumber
                  value={dtWarn} min={0} max={10} step={0.5}
                  onChange={(v) => setDtWarn(v ?? 4.5)}
                  addonAfter="°C"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Current active: {btu.deltaTWarning}°C</Text>
              </div>
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Critical threshold — below this ΔT triggers critical fault
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InputNumber
                  value={dtCrit} min={0} max={10} step={0.5}
                  onChange={(v) => setDtCrit(v ?? 3.5)}
                  addonAfter="°C"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Current active: {btu.deltaTCritical}°C</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Supply Temperature Thresholds" size="small">
            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                High supply warning — plant not cooling sufficiently
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InputNumber
                  value={supHigh} min={0} max={15} step={0.5}
                  onChange={(v) => setSupHigh(v ?? 8.5)}
                  addonAfter="°C"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Active: {btu.supplyTempHigh}°C</Text>
              </div>
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Low supply advisory — condensation risk on pipework
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InputNumber
                  value={supLow} min={0} max={10} step={0.5}
                  onChange={(v) => setSupLow(v ?? 5.5)}
                  addonAfter="°C"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Active: {btu.supplyTempLow}°C</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="Billing & After-Hours Thresholds" size="small">
            <div style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                MTD billing deviation warning — % above expected
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InputNumber
                  value={billDev} min={0} max={50} step={5}
                  onChange={(v) => setBillDev(v ?? 15)}
                  addonAfter="%"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Active: {btu.billingDeviation}%</Text>
              </div>
            </div>
            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                After-hours consumption advisory — kWh outside 08–20h
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <InputNumber
                  value={ahKwh} min={0} max={20} step={0.5}
                  onChange={(v) => setAhKwh(v ?? 2.0)}
                  addonAfter="kWh"
                />
                <Text type="secondary" style={{ fontSize: 12 }}>Active: {btu.afterHoursKwh} kWh</Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="About These Thresholds" size="small">
            <Text style={{ fontSize: 12, color: '#595959' }}>
              <strong>ΔT ≥ 5°C</strong> is the ASHRAE/district cooling design standard for chilled water systems.
              Lower ΔT means water passes through AHU coils without absorbing sufficient heat — typically
              caused by a stuck-open bypass valve or oversized pump.
            </Text>
            <Divider style={{ margin: '10px 0' }} />
            <Text style={{ fontSize: 12, color: '#595959' }}>
              <strong>Billing deviation</strong> is calculated month-to-date vs the historical daily average
              for this branch. A 15% deviation at this billing rate (SGD 0.088/kWh) triggers a review.
            </Text>
            <div style={{ marginTop: 12 }}>
              <Button type="primary" onClick={applyThresholds} size="small">
                Apply Thresholds
              </Button>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>
                Changes take effect on the next 5-second evaluation cycle.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  )

  // ── FDD tab ───────────────────────────────────────────────────────────────
  const fddContent = (
    <Card title="Fault Detection & Diagnostics" size="small">
      <FDDPanel findings={btu.allFindings} systemLabel="BTU metering" />
    </Card>
  )

  function tabLabel(icon: React.ReactNode, text: string, count?: number) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}
        <span>{text}</span>
        {count != null && count > 0 && (
          <span style={{
            background: '#cf1322', color: '#fff', borderRadius: 8,
            padding: '0 5px', fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: 'center' as const,
          }}>
            {count}
          </span>
        )}
      </span>
    )
  }

  const items = [
    { key: 'overview', label: tabLabel(<AppstoreOutlined />, 'Overview'),                children: overviewContent },
    { key: 'control',  label: tabLabel(<ControlOutlined />, 'Thresholds'),               children: controlContent },
    { key: 'fdd',      label: tabLabel(<BellOutlined />, 'Alarms & FDD', critWarnCount), children: fddContent },
    { key: 'points',   label: tabLabel(<TableOutlined />, 'Point List'),                 children: <BTUPointsTab /> },
    { key: 'settings', label: tabLabel(<SettingOutlined />, 'Settings'),                 children: <SettingsTab findingsCount={btu.allFindings.length} /> },
  ]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1380, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <AreaChartOutlined style={{ fontSize: 20, color: '#096dd9' }} />
        <Title level={3} style={{ margin: 0 }}>BTU Metering — DBS Branches</Title>
        {overallHealth === 'critical' && <Badge count="FAULT" color="#cf1322" />}
        {overallHealth === 'warning'  && <Badge count="WARNING" color="#d48806" />}
        {overallHealth === 'ok'       && <Badge count="All OK" color="#52c41a" />}
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          Chilled water metering — flow + supply/return temp · SGD 0.088/kWh
        </Text>
      </div>

      <Tabs items={items} size="middle" type="card" />

      <style>{`
        .row-critical td { background: #fff1f0 !important; }
        .row-warning  td { background: #fffbe6 !important; }
      `}</style>
    </div>
  )
})

export default BTUPage
