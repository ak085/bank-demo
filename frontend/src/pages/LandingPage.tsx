import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { ThunderboltOutlined, BulbOutlined, AreaChartOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useStore } from '../stores'
import { overallHealth } from '../types/fdd'
import PageHeroImage from '../components/PageHeroImage'
import heroImg from '../assets/hero/bank_branches_dashboard_landing_page.jpg'

const { Title, Paragraph, Text } = Typography

function HealthPill({ health }: { health: 'ok' | 'warning' | 'critical' }) {
  if (health === 'critical')
    return <Tag color="error" icon={<CloseCircleOutlined />} style={{ marginBottom: 8 }}>Active Fault</Tag>
  if (health === 'warning')
    return <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ marginBottom: 8 }}>Warning</Tag>
  return <Tag color="success" icon={<CheckCircleOutlined />} style={{ marginBottom: 8 }}>All Clear</Tag>
}

const LandingPage: React.FC = observer(() => {
  const navigate = useNavigate()
  const { vrv, lighting, btu } = useStore()

  const vrvHealth     = overallHealth(vrv.allFindings)
  const lightingHealth = overallHealth(lighting.allFindings)
  const btuHealth     = overallHealth(btu.allFindings)

  const TILES = [
    {
      key: 'vrv', path: '/vrv',
      icon: <ThunderboltOutlined style={{ fontSize: 36, color: '#d4380d' }} />,
      iconBg: '#ffd8bf', cardBg: '#fff2e8',
      title: 'VRV Optimisation',
      subtitle: 'Variable Refrigerant Volume — Room Units',
      description: '6 units across Banking Hall, Customer Service, Manager\'s Office, Interview Room, Server Room, and Staff Back Office. Monitors Daikin Modbus points — room temp, setpoint deviation, filter status, error codes, and communication health.',
      tag: `${vrv.units.length} Units`,
      tagColor: 'volcano' as const,
      findings: vrv.allFindings,
      health: vrvHealth,
      critCount: vrv.allFindings.filter(f => f.severity === 'critical').length,
      warnCount: vrv.allFindings.filter(f => f.severity === 'warning').length,
    },
    {
      key: 'lighting', path: '/lighting',
      icon: <BulbOutlined style={{ fontSize: 36, color: '#d48806' }} />,
      iconBg: '#fff1b8', cardBg: '#fffbe6',
      title: 'Lighting Optimisation',
      subtitle: 'Lumani Smart Lighting — Dimming & Motion',
      description: '6 zones monitored via Lumani API: On/Off, Dimming (0–100%), and Motion Count. FDD rules detect occupied rooms with lights off, dimmer driver faults, after-hours waste, and deviations from the branch energy schedule.',
      tag: `${lighting.zones.length} Zones`,
      tagColor: 'gold' as const,
      findings: lighting.allFindings,
      health: lightingHealth,
      critCount: lighting.allFindings.filter(f => f.severity === 'critical').length,
      warnCount: lighting.allFindings.filter(f => f.severity === 'warning').length,
    },
    {
      key: 'btu', path: '/btu',
      icon: <AreaChartOutlined style={{ fontSize: 36, color: '#096dd9' }} />,
      iconBg: '#bae0ff', cardBg: '#e6f4ff',
      title: 'BTU Metering',
      subtitle: 'Chilled Water Billing — Branches',
      description: '6 branch locations. Monitors ΔT efficiency, supply temperature, month-to-date billing deviation, and after-hours consumption.',
      tag: `${btu.branches.length} Branches`,
      tagColor: 'blue' as const,
      findings: btu.allFindings,
      health: btuHealth,
      critCount: btu.allFindings.filter(f => f.severity === 'critical').length,
      warnCount: btu.allFindings.filter(f => f.severity === 'warning').length,
    },
  ]

  return (
    <div style={{ padding: '36px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Tag color="red" style={{ fontSize: 11, letterSpacing: 1 }}>
            DEMO — Bank Building Intelligence Platform
          </Tag>
        </div>
        <Title level={2} style={{ marginBottom: 4 }}>Bank Building Intelligence</Title>
        <Paragraph type="secondary" style={{ fontSize: 15 }}>
          Fault Detection & Diagnostics across three building systems. Select a system to review live findings.
        </Paragraph>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
        <div style={{ width: '100%', maxWidth: 980 }}>
          <PageHeroImage
            src={heroImg}
            alt="Bank branch building intelligence — HVAC, lighting, and BTU metering overview"
            caption="Bank Building Intelligence — branch network overview"
            size="large"
          />
        </div>
      </div>

      {/* Tiles */}
      <Row gutter={[24, 24]} justify="center">
        {TILES.map(tile => (
          <Col key={tile.key} xs={24} sm={24} md={8}>
            <Card
              hoverable
              onClick={() => navigate(tile.path)}
              style={{
                borderRadius: 10,
                background: tile.cardBg,
                border: tile.health === 'critical' ? '2px solid #cf1322'
                  : tile.health === 'warning' ? '2px solid #d48806'
                  : '1px solid #e0e0e0',
                cursor: 'pointer',
                height: '100%',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 12, background: tile.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                {tile.icon}
              </div>

              {/* Health status */}
              <div style={{ marginBottom: 6 }}>
                <HealthPill health={tile.health} />
                {tile.critCount > 0 && (
                  <Text style={{ fontSize: 11, color: '#cf1322', marginLeft: 4 }}>
                    {tile.critCount} critical
                  </Text>
                )}
                {tile.warnCount > 0 && (
                  <Text style={{ fontSize: 11, color: '#d48806', marginLeft: tile.critCount > 0 ? 8 : 4 }}>
                    {tile.warnCount} warning{tile.warnCount > 1 ? 's' : ''}
                  </Text>
                )}
              </div>

              <Tag color={tile.tagColor} style={{ marginBottom: 8, fontSize: 11 }}>{tile.tag}</Tag>

              <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>{tile.title}</Title>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>{tile.subtitle}</Paragraph>
              <Paragraph style={{ fontSize: 12, marginBottom: 0, color: '#555' }}>{tile.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          Demo — all data is simulated. Live integration via Daikin Modbus and Lumani API available upon project go-ahead.
          Data refreshes every 5 s.
        </Paragraph>
      </div>
    </div>
  )
})

export default LandingPage
