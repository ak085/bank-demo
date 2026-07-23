import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  Card, Row, Col, Table, Tag, Statistic, Typography, Divider, Badge,
  Tabs, Slider, Select, Switch, Radio, Button, message, Space,
  Form, Input, List, Avatar, Segmented, InputNumber, Progress,
} from 'antd'
import {
  ThunderboltOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  AppstoreOutlined, ControlOutlined, BellOutlined, SettingOutlined,
  MailOutlined, PhoneOutlined, UserOutlined, RobotOutlined, DeleteOutlined,
  TableOutlined, LineChartOutlined, ClusterOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../stores'
import { FDDPanel } from '../components/FDDPanel'
import PageHeroImage from '../components/PageHeroImage'
import type { VRVUnit } from '../stores/VRVStore'
import heroImg from '../assets/hero/bank_vrv_optimization_page.webp'
import schematicImg from '../assets/hero/vrv_schematic.jpg'

const { Title, Text } = Typography

function HealthTag({ health }: { health: 'ok' | 'warning' | 'critical' }) {
  if (health === 'critical') return <Tag color="error" icon={<CloseCircleOutlined />}>FAULT</Tag>
  if (health === 'warning')  return <Tag color="warning" icon={<ExclamationCircleOutlined />}>WARNING</Tag>
  return <Tag color="success" icon={<CheckCircleOutlined />}>Normal</Tag>
}

function modeLabel(m: VRVUnit['mode']) {
  return { cool: 'Cool', fan: 'Fan Only', auto: 'Auto', dry: 'Dry' }[m]
}

const FAN_OPTIONS = [
  { value: 0, label: 'Auto' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Med' },
  { value: 5, label: 'High' },
]

// ─── Settings tab (notification contacts + AI agent + algorithm ref) ───────
function SettingsTab({ findingsCount }: { findingsCount: number }) {
  const [contacts, setContacts] = useState([
    { key: '1', name: 'Facilities Manager', email: 'facilities@bank-demo.local', phone: '+65 9111 2345', severity: 'critical', enabled: true },
    { key: '2', name: 'M&E Engineer', email: 'me-team@bank-demo.local', phone: '+65 8222 3456', severity: 'warning', enabled: true },
  ])
  const [form] = Form.useForm()

  function addContact(values: { name: string; email: string; phone: string; severity: string }) {
    setContacts(c => [...c, { key: Date.now().toString(), enabled: true, ...values }])
    form.resetFields()
    message.success('Contact added')
  }

  const algorithms = [
    { rule: 'FDD-VRV-C1', condition: 'Modbus register 30006 bit set', severity: 'Critical', action: 'Check RS485 wiring & gateway' },
    { rule: 'FDD-VRV-E1', condition: 'Error register 33601 ≠ "00"', severity: 'Critical', action: 'Contact Daikin service with error code' },
    { rule: 'FDD-VRV-T1', condition: 'Room temp > setpoint + 1.5°C', severity: 'Warning / Critical at +3°C', action: 'Inspect filter, coil, refrigerant' },
    { rule: 'FDD-VRV-F1', condition: 'Register 32002 bit7 = 1', severity: 'Warning', action: 'Schedule filter cleaning' },
    { rule: 'FDD-VRV-SP', condition: 'Setpoint < 20°C', severity: 'Advisory', action: 'Raise to 22–24°C' },
    { rule: 'FDD-VRV-FO', condition: 'Register 32001 bit2 set during 08–20h', severity: 'Warning', action: 'Verify maintenance override' },
  ]

  return (
    <Row gutter={[16, 16]}>
      {/* System Monitor card */}
      <Col span={24}>
        <Card
          title={<><RobotOutlined style={{ marginRight: 6, color: '#1677ff' }} />System Monitor — VRV</>}
          size="small"
          extra={<Tag color="success">Active</Tag>}
        >
          <Row gutter={24}>
            <Col span={6}><Statistic title="Evaluation Cycle" value={5} suffix="s" /></Col>
            <Col span={6}><Statistic title="FDD Rules Loaded" value={6} /></Col>
            <Col span={6}><Statistic title="Active Findings" value={findingsCount} /></Col>
            <Col span={6}><Statistic title="Data Points / Unit" value={9} /></Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            The <strong>VRV Monitor</strong> continuously polls Daikin Modbus registers (via the BMS gateway)
            for all 6 indoor units every 5 seconds. It evaluates 6 rule-based FDD checks and publishes
            findings to this dashboard in real time. In production, findings are written to a time-series
            database and trigger SMS/email notifications based on severity thresholds.
            Each equipment type runs its own dedicated monitor (VRV, Lighting, BTU) so faults
            in one system do not delay analysis of others.
          </Text>
        </Card>
      </Col>

      {/* Algorithm reference */}
      <Col span={24}>
        <Card title="Algorithm & Rule Reference" size="small">
          <Table
            dataSource={algorithms}
            size="small"
            pagination={false}
            rowKey="rule"
            columns={[
              { title: 'Rule ID', dataIndex: 'rule', key: 'rule', width: 115, render: (v: string) => <code>{v}</code> },
              { title: 'Trigger Condition', dataIndex: 'condition', key: 'cond' },
              { title: 'Severity', dataIndex: 'severity', key: 'sev', width: 160 },
              { title: 'Recommended Action', dataIndex: 'action', key: 'act' },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
            Data source: Daikin Modbus card registers. Cycle: 5 s. All thresholds follow Daikin BMS
            integration guidelines and the branch HVAC commissioning spec.
          </Text>
        </Card>
      </Col>

      {/* Notification contacts */}
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
              <Input placeholder="name@bank-demo.local" />
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
  access: 'R' | 'R-W' | 'Derived'; unit: string
  value: string | number; status: 'normal' | 'warning' | 'critical'; ctrl: boolean
}

const VRVPointsTab = observer(function VRVPointsTab() {
  const { vrv } = useStore()
  const [selId, setSelId] = useState('VRV-01')
  const u = vrv.units.find(x => x.unitId === selId) ?? vrv.units[0]
  const health = vrv.unitHealth(u)
  const dev = +(u.roomTempC - u.setpointC).toFixed(1)
  const devSt: PointRow['status'] = dev > 3 ? 'critical' : dev > 1.5 ? 'warning' : 'normal'

  const points: PointRow[] = [
    { key: 'comm',   pointId: '30006',          name: 'Comm Health',      desc: 'Gateway Modbus response bitfield — 0 = healthy',                    access: 'R',       unit: '—',        value: u.commError ? 'ERROR' : 'OK',               status: u.commError ? 'critical' : 'normal',       ctrl: false },
    { key: 'run',    pointId: '32001 bit0',      name: 'Running',          desc: 'Unit operating state — 1 = running, 0 = stopped',                   access: 'R',       unit: '—',        value: u.running ? 'Running' : 'Stopped',           status: 'normal',                                  ctrl: false },
    { key: 'foff',   pointId: '32001 bit2',      name: 'Forced Off',       desc: 'BMS global force-off override — write 1 to stop unit',              access: 'R-W',     unit: '—',        value: u.forcedOff ? 'Active' : 'Inactive',         status: u.forcedOff ? 'warning' : 'normal',        ctrl: true  },
    { key: 'thermo', pointId: '32001 bit7',      name: 'Thermo-On',        desc: 'Compressor actively cooling — room temp is above setpoint',         access: 'R',       unit: '—',        value: u.thermostatOn ? 'Cooling' : 'Idle',         status: 'normal',                                  ctrl: false },
    { key: 'sp',     pointId: '32003',           name: 'Setpoint',         desc: 'Active temperature setpoint (register ×10 = °C)',                   access: 'R-W',     unit: '°C',       value: u.setpointC.toFixed(1),                      status: u.setpointC < 20 ? 'warning' : 'normal',   ctrl: true  },
    { key: 'rtemp',  pointId: '32005',           name: 'Room Temperature', desc: 'Indoor unit temperature sensor (register ×10 = °C)',                access: 'R',       unit: '°C',       value: u.roomTempC.toFixed(1),                      status: devSt,                                     ctrl: false },
    { key: 'mode',   pointId: '32002 bit10–12',  name: 'Mode',             desc: 'Operating mode enum — Cool / Fan / Auto / Dry (tropical: no Heat)', access: 'R-W',     unit: '—',        value: modeLabel(u.mode),                           status: 'normal',                                  ctrl: true  },
    { key: 'filter', pointId: '32002 bit7',      name: 'Filter Sign',      desc: 'Filter maintenance alert — 1 = cleaning required',                 access: 'R',       unit: '—',        value: u.filterSign ? 'Alert' : 'OK',               status: u.filterSign ? 'warning' : 'normal',       ctrl: false },
    { key: 'fan',    pointId: '42001 bit12–14',  name: 'Fan Speed',        desc: 'Fan step command — 0 = Auto, 2 = Low, 3 = Med, 5 = High',           access: 'R-W',     unit: 'step 0–5', value: u.fanSpeed,                                  status: 'normal',                                  ctrl: true  },
    { key: 'errc',   pointId: '33601',           name: 'Error Code',       desc: 'Hardware fault code — "00" = no fault',                             access: 'R',       unit: '—',        value: u.errorCode,                                 status: u.hasError ? 'critical' : 'normal',        ctrl: false },
    { key: 'errfl',  pointId: '33602 bit8',      name: 'Error Flag',       desc: 'Hardware error flag from alarm register',                           access: 'R',       unit: '—',        value: u.hasError ? 'FAULT' : 'Normal',             status: u.hasError ? 'critical' : 'normal',        ctrl: false },
    { key: 'alfl',   pointId: '33602 bit9',      name: 'Alarm Flag',       desc: 'Alarm condition flag from alarm register',                          access: 'R',       unit: '—',        value: u.hasAlarm ? 'ALARM' : 'Normal',             status: u.hasAlarm ? 'critical' : 'normal',        ctrl: false },
    { key: 'rhrs',   pointId: '—',               name: 'Run Hours Today',  desc: 'Accumulated operating hours since midnight (derived)',              access: 'Derived',  unit: 'h',        value: u.runHoursToday.toFixed(1),                  status: 'normal',                                  ctrl: false },
    { key: 'tdev',   pointId: '—',               name: 'Temp Deviation',   desc: 'Room Temp − Setpoint — primary input to FDD-VRV-T1 rule',           access: 'Derived',  unit: '°C',       value: (dev >= 0 ? '+' : '') + dev,                 status: devSt,                                     ctrl: false },
  ]

  const cols = [
    { title: 'Register / Field',  dataIndex: 'pointId', key: 'pid',    width: 155,
      render: (v: string) => <code style={{ fontSize: 11, color: '#595959' }}>{v}</code> },
    { title: 'Name',              dataIndex: 'name',    key: 'name',   width: 160 },
    { title: 'Description',       dataIndex: 'desc',    key: 'desc' },
    { title: 'Access', dataIndex: 'access', key: 'acc', width: 80,
      render: (v: string) => (
        <Tag color={v === 'R-W' ? 'blue' : v === 'Derived' ? 'purple' : 'default'}
          style={{ fontSize: 10, margin: 0 }}>{v}</Tag>
      ) },
    { title: 'Unit',              dataIndex: 'unit',    key: 'unit',   width: 85,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
    { title: 'Live Value', key: 'val', width: 145,
      render: (_: unknown, row: PointRow) => {
        const color = row.status === 'critical' ? '#cf1322' : row.status === 'warning' ? '#d48806' : '#389e0d'
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ color, fontFamily: 'monospace', fontSize: 13 }}>{row.value}</Text>
            {row.ctrl && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>→ Control</Tag>}
          </span>
        )
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
        <Text style={{ fontSize: 12 }}>Unit:</Text>
        <Segmented
          size="small"
          options={vrv.units.map(x => ({
            label: (
              <span>
                {x.unitId}
                {vrv.unitHealth(x) === 'critical' && <span style={{ color: '#cf1322', marginLeft: 3 }}>●</span>}
                {vrv.unitHealth(x) === 'warning'  && <span style={{ color: '#d48806', marginLeft: 3 }}>●</span>}
              </span>
            ),
            value: x.unitId,
          }))}
          value={selId}
          onChange={v => setSelId(v as string)}
        />
        <Tag color={health === 'critical' ? 'error' : health === 'warning' ? 'warning' : 'success'}
          style={{ marginLeft: 'auto' }}>
          {u.room}
        </Tag>
      </div>
      <Table<PointRow>
        dataSource={points} columns={cols} rowKey="key"
        pagination={false} size="small" scroll={{ x: 'max-content' }}
        rowClassName={(r) => r.status === 'critical' ? 'row-critical' : r.status === 'warning' ? 'row-warning' : ''}
      />
      <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
        <Tag color="default" style={{ fontSize: 10 }}>R</Tag> Read-only sensor / status &nbsp;
        <Tag color="blue"    style={{ fontSize: 10 }}>R-W</Tag> Read + Write via BMS API &nbsp;
        <Tag color="purple"  style={{ fontSize: 10 }}>Derived</Tag> Calculated from raw points &nbsp;|&nbsp;
        Daikin Modbus card · register values ×10 for temperatures · refreshes every 5 s
      </div>
    </div>
  )
})

// ─── Energy tab ────────────────────────────────────────────────────────────
const VRVEnergyTab = observer(function VRVEnergyTab() {
  const store = useStore()
  const { vrv, darkMode } = store

  const savedSgd = (vrv.totalKwhSaved * store.tariffSgd).toFixed(2)
  const savingsPct = vrv.totalKwhBaseline > 0
    ? Math.round((vrv.totalKwhSaved / vrv.totalKwhBaseline) * 100) : 0

  const energyOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { seriesName: string; value: number; axisValue: string }[]) =>
        `<b>${params[0]?.axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${(+p.value).toFixed(2)} kW</b>`).join('<br/>'),
    },
    legend: {
      data: ['Pre-optimisation Baseline', 'Optimised (Current)'],
      bottom: 0, itemHeight: 10, textStyle: { fontSize: 11 },
    },
    grid: { left: 50, right: 16, top: 16, bottom: 48 },
    xAxis: { type: 'category' as const, data: vrv.energyHistory.map(h => h.time), axisLabel: { fontSize: 10, interval: 5 } },
    yAxis: { type: 'value' as const, name: 'kW', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 10 }, min: 0 },
    series: [
      {
        name: 'Pre-optimisation Baseline',
        type: 'line' as const,
        data: vrv.energyHistory.map(h => h.baseline),
        lineStyle: { color: '#bfbfbf', type: 'dashed' as const, width: 2 },
        itemStyle: { color: '#bfbfbf' },
        symbol: 'none',
      },
      {
        name: 'Optimised (Current)',
        type: 'line' as const,
        data: vrv.energyHistory.map(h => h.actual),
        smooth: true,
        lineStyle: { color: '#389e0d', width: 2 },
        itemStyle: { color: '#389e0d' },
        areaStyle: { color: 'rgba(56, 158, 13, 0.12)' },
        symbol: 'none',
      },
    ],
  }

  return (
    <div>
      {/* Global tariff setting */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
        background: '#f5f5f5', padding: '10px 14px', borderRadius: 6,
      }}>
        <Text style={{ fontSize: 13, fontWeight: 500 }}>Electricity Tariff:</Text>
        <InputNumber
          min={0.01} max={2} step={0.01} precision={3}
          value={store.tariffSgd}
          onChange={(v) => store.setTariff(v ?? 0.25)}
          addonBefore="SGD" addonAfter="/kWh"
          style={{ width: 175 }}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Global setting — updates cost calculations on VRV, Lighting, and BTU pages instantly.
        </Text>
      </div>

      {/* KPI row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Baseline Today" value={vrv.totalKwhBaseline} suffix="kWh"
              valueStyle={{ color: '#8c8c8c' }} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Pre-optimisation estimate</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Optimised Today" value={vrv.totalKwhOptimised} suffix="kWh" />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Smart schedule + setpoint control</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Energy Saved" value={vrv.totalKwhSaved} suffix="kWh"
              valueStyle={{ color: '#389e0d' }} />
            <div style={{ fontSize: 11, color: '#52c41a', marginTop: 2 }}>
              {savingsPct}% reduction vs baseline
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Cost Saved Today" value={`$${savedSgd}`}
              valueStyle={{ color: '#389e0d' }} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>@ SGD {store.tariffSgd}/kWh</div>
          </Card>
        </Col>
      </Row>

      {/* 24h power chart */}
      <Card title="24-Hour Power Profile — Baseline vs Optimised" size="small" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
          Grey dashed = pre-installation baseline (fixed setpoints, no occupancy schedule) &nbsp;|&nbsp;
          Green = current smart-controlled consumption &nbsp;|&nbsp;
          Savings = gap between the two lines
        </div>
        <ReactECharts option={energyOption} style={{ height: 240 }} theme={darkMode ? 'dark' : undefined} />
      </Card>

      {/* Per-unit breakdown */}
      <Card title="Per-Unit Run Hours & Estimated Consumption" size="small">
        <Table
          dataSource={vrv.units.map(u => ({
            key: u.id,
            unit: u.unitId,
            room: u.room,
            runHrs: +u.runHoursToday.toFixed(1),
            estKwh: +(u.runHoursToday * 0.85).toFixed(1),
            health: vrv.unitHealth(u),
          }))}
          size="small" pagination={false}
          columns={[
            { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 80 },
            { title: 'Room', dataIndex: 'room', key: 'room' },
            { title: 'Run Hours', dataIndex: 'runHrs', key: 'hrs', width: 105,
              render: (v: number) => `${v} h` },
            { title: 'Est. kWh Today', dataIndex: 'estKwh', key: 'kwh', width: 135,
              render: (v: number, r: { health: string }) => (
                <Text style={{ color: r.health === 'critical' ? '#cf1322' : r.health === 'warning' ? '#d48806' : '#595959', fontWeight: 500 }}>
                  {v} kWh
                </Text>
              ) },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
          Estimated from run hours × ~850 W average unit input power. Total system comparison uses
          BMS historical profiles — baseline represents operation without schedule optimisation.
        </Text>
      </Card>
    </div>
  )
})

// ─── Main page ─────────────────────────────────────────────────────────────
const VRVPage: React.FC = observer(() => {
  const { vrv, darkMode } = useStore()

  const overallHealth = vrv.unitsCritical > 0 ? 'critical' : vrv.unitsWarning > 0 ? 'warning' : 'ok'
  const critWarnCount = vrv.allFindings.filter(f => f.severity !== 'info').length

  // Chart: room temp trend (3 units)
  const chartUnits  = ['VRV-01', 'VRV-03', 'VRV-05']
  const colors      = { 'VRV-01': '#389e0d', 'VRV-03': '#d48806', 'VRV-05': '#cf1322' }
  const spColors    = { 'VRV-01': '#b7eb8f', 'VRV-03': '#ffe58f', 'VRV-05': '#ffccc7' }

  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: [...chartUnits.map(u => `${u} Room`), ...chartUnits.map(u => `${u} SP`)],
      bottom: 0, itemHeight: 10, textStyle: { fontSize: 11 },
    },
    grid: { left: 48, right: 16, top: 36, bottom: 64 },
    xAxis: {
      type: 'category' as const,
      data: vrv.tempHistory.map(h => h.time),
      axisLabel: { fontSize: 10, interval: 5 },
    },
    yAxis: { type: 'value' as const, name: '°C', min: 16, max: 32 },
    series: [
      ...chartUnits.map(uid => ({
        name: `${uid} Room`,
        type: 'line' as const,
        smooth: true,
        data: vrv.tempHistory.map(h => h[uid]),
        lineStyle: { color: colors[uid as keyof typeof colors], width: 2 },
        symbol: 'none',
      })),
      ...chartUnits.map(uid => {
        const u = vrv.units.find(x => x.unitId === uid)
        return {
          name: `${uid} SP`,
          type: 'line' as const,
          data: vrv.tempHistory.map(() => u?.setpointC ?? 24),
          lineStyle: { color: spColors[uid as keyof typeof spColors], type: 'dashed' as const, width: 1.5 },
          symbol: 'none',
        }
      }),
    ],
  }

  // Table columns
  const columns = [
    { title: 'Health', key: 'health', width: 90,
      render: (_: unknown, u: VRVUnit) => <HealthTag health={vrv.unitHealth(u)} /> },
    { title: 'ID', dataIndex: 'unitId', key: 'id', width: 70 },
    { title: 'Room', dataIndex: 'room', key: 'room' },
    { title: 'Status', key: 'status', width: 90,
      render: (_: unknown, u: VRVUnit) => u.running
        ? <Tag color="green">Running</Tag> : <Tag color="default">Off</Tag> },
    { title: 'Room Temp', key: 'rtemp', width: 95,
      render: (_: unknown, u: VRVUnit) => {
        const dev = u.roomTempC - u.setpointC
        const color = dev > 3 ? '#cf1322' : dev > 1.5 ? '#d48806' : '#389e0d'
        return <Text style={{ color, fontWeight: dev > 1.5 ? 600 : 400 }}>{u.roomTempC.toFixed(1)}°C</Text>
      } },
    { title: 'Setpoint', key: 'sp', width: 80,
      render: (_: unknown, u: VRVUnit) => `${u.setpointC.toFixed(1)}°C` },
    { title: 'ΔT', key: 'dt', width: 65,
      render: (_: unknown, u: VRVUnit) => {
        const dev = u.roomTempC - u.setpointC
        const color = dev > 3 ? '#cf1322' : dev > 1.5 ? '#d48806' : '#389e0d'
        return <Text style={{ color, fontWeight: 600 }}>{dev > 0 ? '+' : ''}{dev.toFixed(1)}</Text>
      } },
    { title: 'Mode', key: 'mode', width: 80,
      render: (_: unknown, u: VRVUnit) => modeLabel(u.mode) },
    { title: 'Thermo', key: 'thermo', width: 110,
      render: (_: unknown, u: VRVUnit) => u.thermostatOn
        ? <Tag color="blue">Cooling</Tag> : <Tag color="default">Idle</Tag> },
    { title: 'Filter', key: 'filter', width: 70,
      render: (_: unknown, u: VRVUnit) => u.filterSign
        ? <Tag color="warning">Alert</Tag> : <Tag color="success">OK</Tag> },
    { title: 'Error', key: 'err', width: 75,
      render: (_: unknown, u: VRVUnit) => u.hasError
        ? <Tag color="error">{u.errorCode}</Tag> : <Tag color="default">—</Tag> },
    { title: 'Run Hrs', dataIndex: 'runHoursToday', key: 'hrs', width: 80,
      render: (v: number) => `${v.toFixed(1)} h` },
  ]

  // ── Overview tab ──────────────────────────────────────────────────────────
  const overviewContent = (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <PageHeroImage
            src={heroImg}
            alt="VRV indoor units networked to outdoor condenser and cloud monitoring"
            caption="VRV network — room units, gateway, and outdoor condenser"
          />
        </Col>
        <Col xs={24} lg={10}>
          <Row gutter={[12, 12]}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff2e8', border: '1px solid #ffd8bf' }}>
                <Progress
                  type="dashboard" size={88}
                  percent={Math.round(Math.min(100, Math.max(0, ((vrv.avgRoomTemp - 18) / (30 - 18)) * 100)))}
                  strokeColor={vrv.avgRoomTemp > 25 ? '#d48806' : '#389e0d'}
                  format={() => <span style={{ fontSize: 15 }}>{vrv.avgRoomTemp.toFixed(1)}°C</span>}
                />
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Avg Room Temp</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff2e8', border: '1px solid #ffd8bf' }}>
                <Progress
                  type="dashboard" size={88}
                  percent={Math.round((vrv.unitsRunning / vrv.units.length) * 100)}
                  strokeColor="#d4380d"
                  format={() => <span style={{ fontSize: 15 }}>{vrv.unitsRunning}/{vrv.units.length}</span>}
                />
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Units Running</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff2e8', border: '1px solid #ffd8bf' }}>
                <Statistic title="Active Faults" value={vrv.unitsCritical}
                  valueStyle={{ color: vrv.unitsCritical > 0 ? '#cf1322' : '#389e0d' }}
                  prefix={vrv.unitsCritical > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center', background: '#fff2e8', border: '1px solid #ffd8bf' }}>
                <Statistic title="Filter Alerts" value={vrv.units.filter(u => u.filterSign).length}
                  valueStyle={{ color: vrv.units.some(u => u.filterSign) ? '#d48806' : '#389e0d' }} />
              </Card>
            </Col>
            <Col span={24}>
              <Card size="small" style={{ background: '#fff2e8', border: '1px solid #ffd8bf' }}
                styles={{ body: { padding: '10px 16px' } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
                  <span>Energy Saved Today (vs baseline)</span>
                  <span>{vrv.totalKwhSaved} kWh</span>
                </div>
                <Progress
                  percent={vrv.totalKwhBaseline > 0 ? Math.round((vrv.totalKwhSaved / vrv.totalKwhBaseline) * 100) : 0}
                  strokeColor="#d4380d" size="small"
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Card title="Room Temperature vs Setpoint — Selected Units (24 h)" size="small" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
          Solid = Room Temp &nbsp;|&nbsp; Dashed = Setpoint &nbsp;|&nbsp;
          <Text style={{ color: '#cf1322', fontSize: 11 }}>Red = Server/IT Room (critical)</Text>
        </div>
        <ReactECharts option={trendOption} style={{ height: 240 }} theme={darkMode ? 'dark' : undefined} />
      </Card>

      <Card title="Unit Status — All Monitored Points" size="small">
        <Table<VRVUnit>
          dataSource={vrv.units}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          rowClassName={(u) => {
            const h = vrv.unitHealth(u)
            if (h === 'critical') return 'row-critical'
            if (h === 'warning')  return 'row-warning'
            return ''
          }}
        />
      </Card>
    </>
  )

  // ── Control tab ───────────────────────────────────────────────────────────
  const controlContent = (
    <>
      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 4, fontSize: 12, color: '#0958d9' }}>
        <strong>Demo mode:</strong> Controls update local simulation state. In production, commands are
        sent via Daikin BMS API (write to Modbus registers 42001–42003).
      </div>
      <Row gutter={[16, 16]}>
        {vrv.units.map(u => (
          <Col span={8} key={u.id}>
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HealthTag health={vrv.unitHealth(u)} />
                  <span style={{ fontWeight: 600 }}>{u.unitId}</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>{u.room}</Text>
                </div>
              }
              extra={
                <Switch
                  size="small"
                  checked={u.running}
                  onChange={() => { vrv.toggleRunning(u.unitId); message.success(`${u.unitId} ${u.running ? 'stopped' : 'started'}`) }}
                  checkedChildren="ON" unCheckedChildren="OFF"
                />
              }
            >
              {/* Setpoint */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontSize: 12 }}>Setpoint</Text>
                  <Text strong style={{ fontSize: 13, color: '#1677ff' }}>{u.setpointC.toFixed(1)}°C</Text>
                </div>
                <Slider
                  min={16} max={30} step={0.5}
                  value={u.setpointC}
                  onChange={(v) => vrv.setSetpoint(u.unitId, v)}
                  marks={{ 16: '16°', 22: '22°', 24: '24°', 28: '28°', 30: '30°' }}
                  tooltip={{ formatter: (v) => `${v}°C` }}
                  disabled={!u.running}
                />
              </div>

              {/* Mode */}
              <div style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Mode</Text>
                <Select
                  value={u.mode} size="small" style={{ width: '100%' }}
                  disabled={!u.running}
                  onChange={(v) => { vrv.setMode(u.unitId, v); message.success(`${u.unitId} mode → ${v}`) }}
                  options={[
                    { value: 'cool', label: '❄ Cool' },
                    { value: 'fan',  label: '💨 Fan Only' },
                    { value: 'auto', label: '⚡ Auto' },
                    { value: 'dry',  label: '💧 Dry' },
                  ]}
                />
              </div>

              {/* Fan speed */}
              <div>
                <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Fan Speed</Text>
                <Radio.Group
                  value={FAN_OPTIONS.reduce((best, opt) =>
                    Math.abs(opt.value - u.fanSpeed) < Math.abs(best.value - u.fanSpeed) ? opt : best,
                    FAN_OPTIONS[0]
                  ).value}
                  onChange={(e) => { vrv.setFanSpeed(u.unitId, e.target.value) }}
                  disabled={!u.running}
                  size="small"
                >
                  {FAN_OPTIONS.map(o => (
                    <Radio.Button key={o.value} value={o.value}
                      style={{ fontSize: 11, padding: '0 8px' }}>
                      {o.label}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )

  // ── Alarms & FDD tab ──────────────────────────────────────────────────────
  const resolvedFaults = [
    {
      key: '1', date: '2026-05-27  14:32', ruleId: 'FDD-VRV-E1', severity: 'critical' as const,
      unit: 'Server / IT Room (VRV-05)',
      description: 'Unit fault — error code A3 (drain pump failure). Unit continued running but drain pan overflow was imminent.',
      resolvedBy: 'Daikin Service Technician',
      resolution: 'Drain pump replaced. Unit reset and recommissioned.',
    },
    {
      key: '2', date: '2026-05-25  09:15', ruleId: 'FDD-VRV-F1', severity: 'warning' as const,
      unit: "Manager's Office (VRV-03)",
      description: 'Filter maintenance alert — register 32002 bit7 set. Restricted airflow increasing energy use ~12%.',
      resolvedBy: 'Facilities Team',
      resolution: 'Filters cleaned. Filter sign reset via register 42002.',
    },
    {
      key: '3', date: '2026-05-22  11:48', ruleId: 'FDD-VRV-T1', severity: 'warning' as const,
      unit: 'Customer Service Area (VRV-02)',
      description: 'Cooling deficit detected — room at 26.1°C vs setpoint 24.0°C (+2.1°C) during peak occupancy hours.',
      resolvedBy: 'Facilities Manager',
      resolution: 'Supply grille partially obstructed by relocated partition — repositioned.',
    },
  ]

  const fddContent = (
    <>
      <Card title="Fault Detection & Diagnostics — Active" size="small" style={{ marginBottom: 16 }}>
        <FDDPanel findings={vrv.allFindings} systemLabel="VRV system" />
      </Card>

      <Card
        title={<><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />Fault History — Last 14 Days</>}
        size="small"
        extra={<Tag color="success">3 resolved</Tag>}
      >
        <Table
          dataSource={resolvedFaults}
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Date / Time', dataIndex: 'date', key: 'date', width: 140,
              render: (v: string) => <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
            { title: 'Rule', dataIndex: 'ruleId', key: 'rule', width: 115,
              render: (v: string) => <code style={{ fontSize: 11 }}>{v}</code> },
            { title: 'Was', dataIndex: 'severity', key: 'sev', width: 90,
              render: (v: string) => (
                <Tag color={v === 'critical' ? 'error' : 'warning'} style={{ fontSize: 10 }}>
                  {v.toUpperCase()}
                </Tag>
              ) },
            { title: 'Location', dataIndex: 'unit', key: 'unit', width: 210 },
            { title: 'Description', dataIndex: 'description', key: 'desc' },
            { title: 'Resolved By', dataIndex: 'resolvedBy', key: 'by', width: 195 },
            { title: 'Resolution', dataIndex: 'resolution', key: 'res' },
            { title: 'Status', key: 'status', width: 85,
              render: () => (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}>Resolved</Tag>
              ) },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 11, marginTop: 10, display: 'block' }}>
          All findings are time-stamped and logged to the BMS database with trigger values and resolution notes.
          Fault history is retained for 90 days and included in the monthly equipment health report.
        </Text>
      </Card>
    </>
  )

  // ── Schematic Diagram tab ─────────────────────────────────────────────────
  const schematicContent = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        <PageHeroImage
          src={schematicImg}
          alt="AiHVAC cloud data-sharing architecture — edge device, connectivity, and cloud modules"
          caption="Data flow: VRV units → OEM communication module → Univers Edge Device → 4G LTE/MQTT → AiHVAC Cloud (Console, Dashboard, AiAgents, Optimization Module). Setpoint overrides flow back down the same path."
          size="large"
        />
      </div>
    </div>
  )

  const tabLabel = (icon: React.ReactNode, text: string, count?: number) => (
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

  const items = [
    { key: 'overview', label: tabLabel(<AppstoreOutlined />, 'Overview'),                    children: overviewContent },
    { key: 'control',  label: tabLabel(<ControlOutlined />, 'Control'),                      children: controlContent },
    { key: 'fdd',      label: tabLabel(<BellOutlined />, 'Alarms & FDD', critWarnCount),     children: fddContent },
    { key: 'points',   label: tabLabel(<TableOutlined />, 'Point List'),                     children: <VRVPointsTab /> },
    { key: 'energy',   label: tabLabel(<LineChartOutlined />, 'Energy'),                     children: <VRVEnergyTab /> },
    { key: 'schematic', label: tabLabel(<ClusterOutlined />, 'Schematic Diagram'),           children: schematicContent },
    { key: 'settings', label: tabLabel(<SettingOutlined />, 'Settings'),                     children: <SettingsTab findingsCount={vrv.allFindings.length} /> },
  ]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <ThunderboltOutlined style={{ fontSize: 20, color: '#d4380d' }} />
        <Title level={3} style={{ margin: 0 }}>VRV Optimisation</Title>
        {overallHealth === 'critical' && <Badge count="FAULT" color="#cf1322" />}
        {overallHealth === 'warning'  && <Badge count="WARNING" color="#d48806" />}
        {overallHealth === 'ok'       && <Badge count="All OK" color="#52c41a" />}
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          Daikin Modbus — {vrv.units.length} units &nbsp;|&nbsp;
          {vrv.unitsCritical > 0 && <Text style={{ color: '#cf1322' }}>{vrv.unitsCritical} Critical &nbsp;</Text>}
          {vrv.unitsWarning  > 0 && <Text style={{ color: '#d48806' }}>{vrv.unitsWarning} Warning</Text>}
          {vrv.unitsCritical === 0 && vrv.unitsWarning === 0 && <Text style={{ color: '#52c41a' }}>All Normal</Text>}
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

export default VRVPage
