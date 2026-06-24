import React, { useState } from 'react'
import { observer } from 'mobx-react-lite'
import {
  Card, Row, Col, Table, Tag, Statistic, Typography, Divider, Badge, Progress,
  Tabs, Slider, Switch, Select, Button, message, Form, Input, List, Avatar, Segmented, InputNumber,
} from 'antd'
import {
  BulbOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  AppstoreOutlined, ControlOutlined, BellOutlined, SettingOutlined,
  MailOutlined, PhoneOutlined, UserOutlined, RobotOutlined, DeleteOutlined,
  TableOutlined, LineChartOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../stores'
import { FDDPanel } from '../components/FDDPanel'
import type { LightingZone } from '../stores/LightingStore'

const { Title, Text } = Typography

function HealthTag({ health }: { health: 'ok' | 'warning' | 'critical' }) {
  if (health === 'critical') return <Tag color="error" icon={<CloseCircleOutlined />}>FAULT</Tag>
  if (health === 'warning')  return <Tag color="warning" icon={<ExclamationCircleOutlined />}>WARNING</Tag>
  return <Tag color="success" icon={<CheckCircleOutlined />}>Normal</Tag>
}

function SettingsTab({ findingsCount }: { findingsCount: number }) {
  const [contacts, setContacts] = useState([
    { key: '1', name: 'Facilities Manager', email: 'facilities@dbs.com.sg', phone: '+65 9111 2345', severity: 'warning', enabled: true },
    { key: '2', name: 'Energy Manager', email: 'energy@dbs.com.sg', phone: '+65 8333 4567', severity: 'info', enabled: false },
  ])
  const [form] = Form.useForm()

  function addContact(values: { name: string; email: string; phone: string; severity: string }) {
    setContacts(c => [...c, { key: Date.now().toString(), enabled: true, ...values }])
    form.resetFields()
    message.success('Contact added')
  }

  const algorithms = [
    { rule: 'FDD-LT-D1', condition: 'Power > 1.8× (rated × dimming/100) when dim < 60%', severity: 'Warning', action: 'Inspect LED driver — possible bypass fault' },
    { rule: 'FDD-LT-O1', condition: 'On + dimming > 10% + motionCount = 0 for > 20 min', severity: 'Warning', action: 'Enable auto-off schedule via Lumani API' },
    { rule: 'FDD-LT-S1', condition: 'Dimming > schedule target + 25% and motion < 30', severity: 'Advisory', action: 'Reset to scheduled dimming level' },
    { rule: 'FDD-LT-AH1', condition: 'On between 22:00–07:00 (non-corridor zones)', severity: 'Advisory', action: 'Verify after-hours access schedule' },
    { rule: 'FDD-LT-MS1', condition: 'High-traffic zone: motion = 0 for > 30 min in business hours', severity: 'Warning', action: 'Inspect PIR sensor — check LED & comms' },
  ]

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card
          title={<><RobotOutlined style={{ marginRight: 6, color: '#d48806' }} />System Monitor — Lighting</>}
          size="small"
          extra={<Tag color="success">Active</Tag>}
        >
          <Row gutter={24}>
            <Col span={6}><Statistic title="Evaluation Cycle" value={5} suffix="s" /></Col>
            <Col span={6}><Statistic title="FDD Rules Loaded" value={5} /></Col>
            <Col span={6}><Statistic title="Active Findings" value={findingsCount} /></Col>
            <Col span={6}><Statistic title="Points / Zone" value={3} suffix="(On/Dim/Motion)" /></Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            The <strong>Lighting Monitor</strong> polls the Lumani lighting API for all 6 zones every 5 seconds,
            reading three data points per zone: On/Off state, dimming level (0–100%), and motion count
            (PIR occupancy proxy). It evaluates energy waste, occupancy patterns, schedule deviations,
            and sensor health. In production, zone-level commands (dim, schedule) are written back
            via the Lumani API write endpoint.
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
              { title: 'Rule ID', dataIndex: 'rule', key: 'rule', width: 110, render: (v: string) => <code>{v}</code> },
              { title: 'Trigger Condition', dataIndex: 'condition', key: 'cond' },
              { title: 'Severity', dataIndex: 'severity', key: 'sev', width: 90 },
              { title: 'Recommended Action', dataIndex: 'action', key: 'act' },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
            Schedule source: DBS AMK ROI spec — 100% (08–12h) · 30% (12–17h) · 35% (17–23h) · 40% (night 24-hr areas).
            Rate: SGD 0.26/kWh.
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
  access: 'R' | 'R-W' | 'Derived'; unit: string
  value: string | number; status: 'normal' | 'warning' | 'critical'; ctrl: boolean
}

const LightingPointsTab = observer(function LightingPointsTab() {
  const { lighting } = useStore()
  const [selId, setSelId] = useState('lt-01')
  const z = lighting.zones.find(x => x.id === selId) ?? lighting.zones[0]
  const health = lighting.zoneHealth(z)

  const driverFault = z.onOff && z.dimming > 0 && z.powerW / (z.ratedPowerW * z.dimming / 100) > 1.8 && z.dimming < 60
  const powerSt: PointRow['status'] = driverFault ? 'critical' : z.powerW > z.expectedPowerW * 1.2 ? 'warning' : 'normal'
  const motionSt: PointRow['status'] = z.minutesNoMotion > 30 ? 'warning' : 'normal'
  const dimmingSt: PointRow['status'] = z.dimming > z.scheduledDimming + 25 ? 'warning' : 'normal'

  const points: PointRow[] = [
    { key: 'onoff',    pointId: 'on_off',             name: 'On/Off State',    desc: 'Zone power state — 0 = off, 1 = on',                                        access: 'R-W',    unit: '—',    value: z.onOff ? 'ON' : 'OFF',                 status: 'normal',  ctrl: true  },
    { key: 'dim',      pointId: 'dimming',             name: 'Dimming Level',   desc: 'PWM control command 0–100% sent to LED driver',                              access: 'R-W',    unit: '%',    value: z.dimming,                               status: dimmingSt, ctrl: true  },
    { key: 'motion',   pointId: 'motion_count',        name: 'Motion Count',    desc: 'PIR sensor event accumulator — 0 = no occupancy, 100 = high activity',      access: 'R',      unit: 'count',value: z.motionCount,                           status: motionSt,  ctrl: false },
    { key: 'power',    pointId: 'power_w',             name: 'Power Draw',      desc: 'Measured real power consumption from driver feedback',                       access: 'R',      unit: 'W',    value: z.powerW.toFixed(0),                     status: powerSt,   ctrl: false },
    { key: 'rated',    pointId: 'rated_power_w',       name: 'Rated Power',     desc: 'Nameplate total at 100% dimming (number of fixtures × fixture wattage)',     access: 'R',      unit: 'W',    value: z.ratedPowerW,                           status: 'normal',  ctrl: false },
    { key: 'expow',    pointId: 'expected_power_w',    name: 'Expected Power',  desc: 'Schedule-based target = Rated × (scheduledDimming / 100)',                   access: 'Derived',unit: 'W',    value: z.expectedPowerW.toFixed(0),             status: 'normal',  ctrl: false },
    { key: 'sched',    pointId: 'scheduled_dimming',   name: 'Schedule Target', desc: 'AMK ROI schedule for current hour: 100%(08–12) · 30%(12–17) · 35%(17–23) · 40%(night)', access: 'Derived', unit: '%', value: z.scheduledDimming,          status: 'normal',  ctrl: false },
    { key: 'nomoT',    pointId: 'minutes_no_motion',   name: 'No-Motion Timer', desc: 'Rolling counter: minutes elapsed since last PIR event — reset on any motion', access: 'Derived',unit: 'min',  value: Math.round(z.minutesNoMotion),           status: motionSt,  ctrl: false },
    { key: 'mtout',    pointId: 'motion_timeout',      name: 'Auto-Off Delay',  desc: 'Absence timeout before auto-off command is issued (configurable)',            access: 'R-W',    unit: 'min',  value: z.motionTimeout,                         status: 'normal',  ctrl: true  },
    { key: 'kwht',     pointId: 'kwh_today',           name: 'Energy Today',    desc: 'Running daily energy accumulator from midnight',                              access: 'Derived',unit: 'kWh',  value: z.kwhToday.toFixed(2),                   status: 'normal',  ctrl: false },
    { key: 'saved',    pointId: 'kwh_saved_today',     name: 'Saved Today',     desc: 'Saved vs rated 24-hour baseline (positive = saving, negative = waste)',       access: 'Derived',unit: 'kWh',  value: z.kwhSavedToday.toFixed(2),              status: z.kwhSavedToday < 0 ? 'warning' : 'normal', ctrl: false },
  ]

  const cols = [
    { title: 'API Field',    dataIndex: 'pointId', key: 'pid',  width: 175,
      render: (v: string) => <code style={{ fontSize: 11, color: '#595959' }}>{v}</code> },
    { title: 'Name',         dataIndex: 'name',    key: 'name', width: 155 },
    { title: 'Description',  dataIndex: 'desc',    key: 'desc' },
    { title: 'Access', dataIndex: 'access', key: 'acc', width: 80,
      render: (v: string) => (
        <Tag color={v === 'R-W' ? 'blue' : v === 'Derived' ? 'purple' : 'default'}
          style={{ fontSize: 10, margin: 0 }}>{v}</Tag>
      ) },
    { title: 'Unit',         dataIndex: 'unit',    key: 'unit', width: 70,
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
        <Text style={{ fontSize: 12 }}>Zone:</Text>
        <Segmented
          size="small"
          options={lighting.zones.map(x => ({
            label: (
              <span>
                {x.zoneId}
                {lighting.zoneHealth(x) === 'critical' && <span style={{ color: '#cf1322', marginLeft: 3 }}>●</span>}
                {lighting.zoneHealth(x) === 'warning'  && <span style={{ color: '#d48806', marginLeft: 3 }}>●</span>}
              </span>
            ),
            value: x.id,
          }))}
          value={selId}
          onChange={v => setSelId(v as string)}
        />
        <Tag color={health === 'critical' ? 'error' : health === 'warning' ? 'warning' : 'success'}
          style={{ marginLeft: 'auto' }}>
          {z.room}
        </Tag>
      </div>
      <Table<PointRow>
        dataSource={points} columns={cols} rowKey="key"
        pagination={false} size="small" scroll={{ x: 'max-content' }}
        rowClassName={(r) => r.status === 'critical' ? 'row-critical' : r.status === 'warning' ? 'row-warning' : ''}
      />
      <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
        <Tag color="default" style={{ fontSize: 10 }}>R</Tag> Read-only sensor / status &nbsp;
        <Tag color="blue"    style={{ fontSize: 10 }}>R-W</Tag> Read + Write via Lumani API &nbsp;
        <Tag color="purple"  style={{ fontSize: 10 }}>Derived</Tag> Calculated from raw points &nbsp;|&nbsp;
        Lumani API · 3 raw points per zone (On/Off · Dimming · Motion) · refreshes every 5 s
      </div>
    </div>
  )
})

// ─── Energy tab ────────────────────────────────────────────────────────────
const LightingEnergyTab = observer(function LightingEnergyTab() {
  const store = useStore()
  const { lighting, darkMode } = store

  const savedSgd = (lighting.ltSavedKwh * store.tariffSgd).toFixed(2)
  const savingsPct = lighting.ltBaselineKwh > 0
    ? Math.round((lighting.ltSavedKwh / lighting.ltBaselineKwh) * 100) : 0

  const energyOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { seriesName: string; value: number; axisValue: string }[]) =>
        `<b>${params[0]?.axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${(+p.value).toFixed(2)} kW</b>`).join('<br/>'),
    },
    legend: {
      data: ['Pre-optimisation Baseline', 'Optimised (Current)', 'Schedule Target'],
      bottom: 0, itemHeight: 10, textStyle: { fontSize: 11 },
    },
    grid: { left: 50, right: 16, top: 16, bottom: 56 },
    xAxis: { type: 'category' as const, data: lighting.powerHistory.map(h => h.time), axisLabel: { fontSize: 10, interval: 5 } },
    yAxis: { type: 'value' as const, name: 'kW', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 10 }, min: 0 },
    series: [
      {
        name: 'Pre-optimisation Baseline',
        type: 'line' as const,
        data: lighting.powerHistory.map(h => h.baseline),
        lineStyle: { color: '#bfbfbf', type: 'dashed' as const, width: 2 },
        itemStyle: { color: '#bfbfbf' },
        symbol: 'none',
      },
      {
        name: 'Optimised (Current)',
        type: 'line' as const,
        data: lighting.powerHistory.map(h => h.actual),
        smooth: true,
        lineStyle: { color: '#d48806', width: 2 },
        itemStyle: { color: '#d48806' },
        areaStyle: { color: 'rgba(212, 136, 6, 0.12)' },
        symbol: 'none',
      },
      {
        name: 'Schedule Target',
        type: 'line' as const,
        data: lighting.powerHistory.map(h => h.expected),
        lineStyle: { color: '#389e0d', type: 'dashed' as const, width: 1.5 },
        itemStyle: { color: '#389e0d' },
        symbol: 'none',
      },
    ],
  }

  return (
    <div>
      {/* Global tariff */}
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
          Global setting — updates cost calculations on VRV and Lighting pages instantly.
        </Text>
      </div>

      {/* KPI row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Baseline Today" value={lighting.ltBaselineKwh} suffix="kWh" precision={1}
              valueStyle={{ color: '#8c8c8c' }} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Fixed 100% — no smart control</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Optimised Today" value={lighting.ltOptimisedKwh} suffix="kWh" precision={1} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Lumani smart scheduling</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Energy Saved" value={lighting.ltSavedKwh} suffix="kWh" precision={1}
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

      {/* Chart */}
      <Card title="24-Hour Power Profile — Baseline vs Optimised" size="small" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
          Grey dashed = old fixed-schedule baseline (no smart dimming or motion control) &nbsp;|&nbsp;
          Amber = Lumani-optimised actual &nbsp;|&nbsp; Green dashed = AMK schedule target &nbsp;|&nbsp;
          Savings = area between baseline and optimised
        </div>
        <ReactECharts option={energyOption} style={{ height: 250 }} theme={darkMode ? 'dark' : undefined} />
      </Card>

      {/* Zone breakdown */}
      <Card title="Per-Zone Energy — Today" size="small">
        <Table
          dataSource={lighting.zones.map(z => ({
            key: z.id,
            zone: z.zoneId,
            room: z.room,
            kwhToday: z.kwhToday.toFixed(2),
            kwhSaved: z.kwhSavedToday.toFixed(2),
            health: lighting.zoneHealth(z),
          }))}
          size="small" pagination={false}
          columns={[
            { title: 'Zone', dataIndex: 'zone', key: 'zone', width: 70 },
            { title: 'Room', dataIndex: 'room', key: 'room' },
            { title: 'kWh Today', dataIndex: 'kwhToday', key: 'kwh', width: 110,
              render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text> },
            { title: 'Saved vs Rated', dataIndex: 'kwhSaved', key: 'saved', width: 135,
              render: (v: string) => (
                <Text style={{ color: parseFloat(v) > 0 ? '#389e0d' : '#cf1322', fontWeight: 500 }}>
                  {parseFloat(v) > 0 ? '+' : ''}{v} kWh
                </Text>
              ) },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
          Baseline = pre-Lumani operation at 95% brightness during business hours, 60% at night.
          "Saved vs Rated" compares each zone vs its rated 24-hour full-power reference.
        </Text>
      </Card>
    </div>
  )
})

const LightingPage: React.FC = observer(() => {
  const { lighting, darkMode } = useStore()

  const overallHealth = lighting.allFindings.some(f => f.severity === 'critical') ? 'critical'
    : lighting.allFindings.some(f => f.severity === 'warning') ? 'warning' : 'ok'
  const critWarnCount = lighting.allFindings.filter(f => f.severity !== 'info').length

  // Zone short labels (IDs) for chart X-axis
  const zoneLabels        = lighting.zones.map(z => z.zoneId)
  const zoneTooltipLabels = lighting.zones.map(z => `${z.zoneId}: ${z.room}`)

  // Power vs expected chart
  const powerBarOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { axisValue: string; seriesName: string; value: number }[]) => {
        const idx = zoneLabels.indexOf(params[0]?.axisValue)
        const room = idx >= 0 ? zoneTooltipLabels[idx] : params[0]?.axisValue
        return `<b>${room}</b><br/>${params.map(p => `${p.seriesName}: <b>${p.value} W</b>`).join('<br/>')}`
      },
    },
    legend: { data: ['Actual (W)', 'Expected (W)'], top: 4, right: 8, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 52, right: 16, top: 32, bottom: 36 },
    xAxis: { type: 'category' as const, data: zoneLabels, axisLabel: { fontSize: 11, interval: 0 } },
    yAxis: { type: 'value' as const, name: 'W', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 10 } },
    series: [
      {
        name: 'Actual (W)', type: 'bar' as const,
        data: lighting.zones.map(z => +z.powerW.toFixed(0)),
        itemStyle: {
          color: (p: { dataIndex: number }) => {
            const h = lighting.zoneHealth(lighting.zones[p.dataIndex])
            return h === 'critical' ? '#cf1322' : h === 'warning' ? '#d48806' : '#389e0d'
          },
        },
        barMaxWidth: 24, barGap: '20%',
      },
      {
        name: 'Expected (W)', type: 'bar' as const,
        data: lighting.zones.map(z => +z.expectedPowerW.toFixed(0)),
        itemStyle: { color: '#d9d9d9' },
        barMaxWidth: 24,
      },
    ],
  }

  // Dimming vs Motion chart
  const dimmingMotionOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { axisValue: string; seriesName: string; value: number }[]) => {
        const idx = zoneLabels.indexOf(params[0]?.axisValue)
        const room = idx >= 0 ? lighting.zones[idx].room : params[0]?.axisValue
        return `<b>${room}</b><br/>${params.map(p => `${p.seriesName}: <b>${p.value}</b>`).join('<br/>')}`
      },
    },
    legend: { data: ['Dimming %', 'Motion Count'], top: 4, right: 8, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 44, right: 52, top: 32, bottom: 28 },
    xAxis: { type: 'category' as const, data: zoneLabels, axisLabel: { fontSize: 11, interval: 0 } },
    yAxis: [
      {
        type: 'value' as const, min: 0, max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { type: 'dashed' as const } },
      },
      {
        type: 'value' as const, min: 0, max: 100,
        axisLabel: { fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Dimming %', type: 'bar' as const, yAxisIndex: 0,
        data: lighting.zones.map(z => z.dimming),
        itemStyle: { color: '#d48806', opacity: 0.85 },
        barMaxWidth: 28,
        label: { show: true, position: 'top' as const, fontSize: 10, color: '#595959', formatter: '{c}%' },
      },
      {
        name: 'Motion Count', type: 'line' as const, yAxisIndex: 1,
        data: lighting.zones.map(z => z.motionCount),
        lineStyle: { color: '#096dd9', width: 2 },
        symbol: 'circle', symbolSize: 7,
        itemStyle: { color: '#096dd9' },
        label: { show: true, position: 'top' as const, fontSize: 10, color: '#096dd9' },
      },
    ],
  }

  // 24h power trend
  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['Actual (kW)', 'Schedule Target (kW)'], bottom: 0, itemHeight: 10, textStyle: { fontSize: 11 } },
    grid: { left: 44, right: 16, top: 16, bottom: 40 },
    xAxis: {
      type: 'category' as const,
      data: lighting.powerHistory.map(h => h.time),
      axisLabel: { fontSize: 10, interval: 5 },
    },
    yAxis: { type: 'value' as const, name: 'kW', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 10 }, min: 0 },
    series: [
      {
        name: 'Actual (kW)', type: 'line' as const,
        data: lighting.powerHistory.map(h => h.actual),
        smooth: true,
        areaStyle: { color: '#fff1b8', opacity: 0.5 },
        lineStyle: { color: '#d48806', width: 2 },
        symbol: 'none',
      },
      {
        name: 'Schedule Target (kW)', type: 'line' as const,
        data: lighting.powerHistory.map(h => h.expected),
        lineStyle: { color: '#8c8c8c', type: 'dashed' as const, width: 1.5 },
        symbol: 'none',
      },
    ],
  }

  // Table columns (overview)
  const columns = [
    { title: 'Health', key: 'health', width: 100,
      render: (_: unknown, z: LightingZone) => <HealthTag health={lighting.zoneHealth(z)} /> },
    { title: 'Zone', dataIndex: 'zoneId', key: 'id', width: 65 },
    { title: 'Room', dataIndex: 'room', key: 'room' },
    { title: 'On/Off', key: 'on', width: 70,
      render: (_: unknown, z: LightingZone) => z.onOff
        ? <Tag color="green">ON</Tag> : <Tag color="default">OFF</Tag> },
    { title: 'Dimming', key: 'dim', width: 130,
      render: (_: unknown, z: LightingZone) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress percent={z.dimming} size="small" style={{ width: 80, margin: 0 }}
            strokeColor="#d48806" showInfo={false} />
          <Text style={{ fontSize: 11, minWidth: 28 }}>{z.dimming}%</Text>
        </div>
      ) },
    { title: 'Motion', key: 'motion', width: 110,
      render: (_: unknown, z: LightingZone) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress percent={z.motionCount} size="small" style={{ width: 60, margin: 0 }}
            strokeColor="#096dd9" showInfo={false} />
          <Text style={{ fontSize: 11 }}>{z.motionCount}</Text>
          {z.minutesNoMotion > 20 && (
            <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>{Math.round(z.minutesNoMotion)}m ago</Tag>
          )}
        </div>
      ) },
    { title: 'Power (W)', key: 'power', width: 95,
      render: (_: unknown, z: LightingZone) => {
        const over = z.expectedPowerW > 0 && z.powerW > z.expectedPowerW * 1.5
        return <Text style={{ color: over ? '#cf1322' : undefined, fontWeight: over ? 600 : 400 }}>
          {z.powerW.toFixed(0)}W</Text>
      } },
    { title: 'Expected (W)', key: 'exp', width: 105,
      render: (_: unknown, z: LightingZone) => <Text type="secondary">{z.expectedPowerW.toFixed(0)}W</Text> },
    { title: 'Schedule', key: 'sched', width: 115,
      render: (_: unknown, z: LightingZone) =>
        `${z.scheduledDimming}% (${(z.ratedPowerW * z.scheduledDimming / 100).toFixed(0)}W)` },
    { title: 'Saved Today', key: 'saved', width: 105,
      render: (_: unknown, z: LightingZone) => (
        <Text style={{ color: z.kwhSavedToday > 0 ? '#389e0d' : '#cf1322' }}>
          {z.kwhSavedToday.toFixed(2)} kWh</Text>
      ) },
  ]

  // ── Overview tab ──────────────────────────────────────────────────────────
  const overviewContent = (
    <>
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Total Power" value={lighting.totalPowerKw} suffix="kW" precision={2}
              valueStyle={{ color: '#d48806' }} />
            <div style={{ fontSize: 11, color: '#999' }}>Target: {lighting.totalExpectedKw.toFixed(2)} kW</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Saved Today" value={lighting.totalSavedKwh} suffix="kWh" precision={1}
              valueStyle={{ color: '#389e0d' }} />
            <div style={{ fontSize: 11, color: '#999' }}>SGD {lighting.savingsSgd.toFixed(2)} @ $0.26/kWh</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Active Zones" value={lighting.activeZones} suffix={`/ ${lighting.zones.length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="Active Findings"
              value={lighting.allFindings.filter(f => f.severity !== 'info').length}
              valueStyle={{ color: lighting.allFindings.some(f => f.severity !== 'info') ? '#d48806' : '#389e0d' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card title="Power: Actual vs Expected (W)" size="small">
            <ReactECharts option={powerBarOption} style={{ height: 220 }} theme={darkMode ? 'dark' : undefined} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Dimming % vs Motion Count" size="small">
            <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
              Bars = Dimming % &nbsp;|&nbsp; Line = Motion Count
            </div>
            <ReactECharts option={dimmingMotionOption} style={{ height: 240 }} theme={darkMode ? 'dark' : undefined} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Total Power — 24 h vs Schedule Target" size="small">
            <ReactECharts option={trendOption} style={{ height: 220 }} theme={darkMode ? 'dark' : undefined} />
          </Card>
        </Col>
      </Row>

      <Card title="Zone Detail — All Monitored Points" size="small">
        <Table<LightingZone>
          dataSource={lighting.zones}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          rowClassName={(z) => {
            const h = lighting.zoneHealth(z)
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
        <strong>Demo mode:</strong> Commands update local simulation. In production, written to the Lumani API (POST /api/zones/&#123;id&#125;/control).
      </div>
      <Row gutter={[16, 16]}>
        {lighting.zones.map(z => (
          <Col span={8} key={z.id}>
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HealthTag health={lighting.zoneHealth(z)} />
                  <span style={{ fontWeight: 600 }}>{z.zoneId}</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>{z.room}</Text>
                </div>
              }
              extra={
                <Switch
                  size="small"
                  checked={z.onOff}
                  onChange={() => { lighting.toggleZone(z.id); message.success(`${z.zoneId} ${z.onOff ? 'OFF' : 'ON'}`) }}
                  checkedChildren="ON" unCheckedChildren="OFF"
                />
              }
            >
              {/* Dimming slider */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontSize: 12 }}>Dimming</Text>
                  <Text strong style={{ fontSize: 13, color: '#d48806' }}>{z.dimming}%</Text>
                </div>
                <Slider
                  min={0} max={100} step={5}
                  value={z.dimming}
                  onChange={(v) => lighting.setDimming(z.id, v)}
                  marks={{ 0: '0', 30: '30', 60: '60', 100: '100' }}
                  tooltip={{ formatter: (v) => `${v}%` }}
                  disabled={!z.onOff}
                  trackStyle={{ backgroundColor: '#d48806' }}
                />
              </div>

              {/* Motion timeout */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 12 }}>Auto-off after no motion</Text>
                <Select
                  value={z.motionTimeout}
                  size="small"
                  style={{ width: 90 }}
                  onChange={(v) => lighting.setMotionTimeout(z.id, v)}
                  options={[
                    { value: 10, label: '10 min' },
                    { value: 20, label: '20 min' },
                    { value: 30, label: '30 min' },
                    { value: 60, label: '60 min' },
                  ]}
                />
              </div>

              {/* Status line */}
              <div style={{ fontSize: 11, color: '#888', borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                Schedule: {z.scheduledDimming}% &nbsp;|&nbsp;
                Motion: {z.motionCount} &nbsp;|&nbsp;
                {z.minutesNoMotion > 0 ? `${Math.round(z.minutesNoMotion)}m no motion` : 'Occupied'}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )

  // ── FDD tab ───────────────────────────────────────────────────────────────
  const fddContent = (
    <Card title="Fault Detection & Diagnostics" size="small">
      <FDDPanel findings={lighting.allFindings} systemLabel="lighting system" />
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
    { key: 'control',  label: tabLabel(<ControlOutlined />, 'Control'),                  children: controlContent },
    { key: 'fdd',      label: tabLabel(<BellOutlined />, 'Alarms & FDD', critWarnCount), children: fddContent },
    { key: 'points',   label: tabLabel(<TableOutlined />, 'Point List'),                 children: <LightingPointsTab /> },
    { key: 'energy',   label: tabLabel(<LineChartOutlined />, 'Energy'),                 children: <LightingEnergyTab /> },
    { key: 'settings', label: tabLabel(<SettingOutlined />, 'Settings'),                 children: <SettingsTab findingsCount={lighting.allFindings.length} /> },
  ]

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <BulbOutlined style={{ fontSize: 20, color: '#d48806' }} />
        <Title level={3} style={{ margin: 0 }}>Lighting Optimisation</Title>
        {overallHealth === 'critical' && <Badge count="FAULT" color="#cf1322" />}
        {overallHealth === 'warning'  && <Badge count="WARNING" color="#d48806" />}
        {overallHealth === 'ok'       && <Badge count="All OK" color="#52c41a" />}
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
          Lumani — {lighting.zones.length} zones &nbsp;|&nbsp; On/Off · Dimming · Motion Count
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

export default LightingPage
