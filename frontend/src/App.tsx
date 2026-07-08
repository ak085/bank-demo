import React, { useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout, Menu, Tag, Button, theme as antdTheme } from 'antd'
import type { MenuProps } from 'antd'
import { observer } from 'mobx-react-lite'
import {
  AppstoreOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  AreaChartOutlined,
  MoonOutlined,
  SunOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useStore } from './stores'
import { overallHealth } from './types/fdd'
import { getStoredUser, clearAuth } from './auth'
import type { AuthUser } from './auth'
import LandingPage  from './pages/LandingPage'
import VRVPage      from './pages/VRVPage'
import LightingPage from './pages/LightingPage'
import BTUPage      from './pages/BTUPage'
import LoginPage    from './pages/LoginPage'
import UsersPage    from './pages/UsersPage'

const { Sider, Content } = Layout

const SIDER_W   = 220
const SIDER_COL = 80

// ─── Auth context ─────────────────────────────────────────────────────────
interface AuthCtx { user: AuthUser; onLogout: () => void }
const AuthContext = createContext<AuthCtx | null>(null)
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthContext.Provider')
  return ctx
}

// ─── Coloured health dot ───────────────────────────────────────────────────
function Dot({ h }: { h: 'ok' | 'warning' | 'critical' }) {
  const color = h === 'critical' ? '#ff4d4f' : h === 'warning' ? '#faad14' : '#52c41a'
  return (
    <span
      aria-label={h}
      style={{
        display: 'inline-block',
        width: 8, height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: h !== 'ok' ? `0 0 5px ${color}` : 'none',
      }}
    />
  )
}

// ─── Inner shell (requires AuthContext) ───────────────────────────────────
const AppShell = observer(() => {
  const navigate         = useNavigate()
  const location         = useLocation()
  const store            = useStore()
  const { user, onLogout } = useAuth()
  const { vrv, lighting, btu } = store
  const [collapsed, setCollapsed] = useState(false)

  const vrvH = overallHealth(vrv.allFindings)
  const ltH  = overallHealth(lighting.allFindings)
  const btuH = overallHealth(btu.allFindings)

  const allFindings = [...vrv.allFindings, ...lighting.allFindings, ...btu.allFindings]
  const critCount   = allFindings.filter(f => f.severity === 'critical').length
  const warnCount   = allFindings.filter(f => f.severity === 'warning').length

  function navLabel(text: string, h: 'ok' | 'warning' | 'critical') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <span style={{ flex: 1 }}>{text}</span>
        <Dot h={h} />
      </span>
    )
  }

  type MenuItem = Required<MenuProps>['items'][number]

  const systemItems: MenuItem[] = [
    { key: '/vrv',      icon: <ThunderboltOutlined />, label: navLabel('VRV Optimisation', vrvH), title: 'VRV Optimisation' },
    { key: '/lighting', icon: <BulbOutlined />,        label: navLabel('Lighting', ltH),           title: 'Lighting' },
    { key: '/btu',      icon: <AreaChartOutlined />,   label: navLabel('BTU Meters', btuH),        title: 'BTU Meters' },
  ]

  const adminItems: MenuItem[] = user.role === 'admin' ? [
    { type: 'divider' as const },
    {
      key: 'admin-group', type: 'group' as const,
      label: !collapsed ? 'Admin' : '',
      children: [
        { key: '/users', icon: <TeamOutlined />, label: 'Users', title: 'Users' },
      ],
    },
  ] : []

  const items: MenuItem[] = [
    { key: '/', icon: <AppstoreOutlined />, label: 'Dashboard' },
    { type: 'divider' as const },
    {
      key: 'systems-group', type: 'group' as const,
      label: !collapsed ? 'Systems' : '',
      children: systemItems,
    },
    ...adminItems,
  ]

  const contentBg = store.darkMode ? '#141414' : '#f0f2f5'

  return (
    <Layout style={{ minHeight: '100vh' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <Sider
        width={SIDER_W}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{
          overflow: 'auto', height: '100vh',
          position: 'fixed', left: 0, top: 0, bottom: 0,
          zIndex: 100, display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Brand */}
        <div style={{
          height: 56, background: '#a80000',
          display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10,
          overflow: 'hidden', flexShrink: 0,
        }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, flexShrink: 0 }}>
            BANK
          </span>
          {!collapsed && (
            <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: 11, lineHeight: 1.35 }}>
              Building<br />Intelligence
            </span>
          )}
        </div>

        {/* Nav */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, borderRight: 0, marginTop: 8 }}
        />

        {/* Bottom status + dark toggle + user + logout */}
        <div style={{
          padding: collapsed ? '12px 0' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          flexShrink: 0,
          marginBottom: 48,
        }}>
          {/* Dark / light toggle */}
          <div style={{
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'space-between',
            alignItems: 'center',
            marginBottom: collapsed ? 8 : 10,
          }}>
            {!collapsed && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                {store.darkMode ? 'Dark mode' : 'Light mode'}
              </span>
            )}
            <Button
              type="text"
              size="small"
              icon={store.darkMode
                ? <SunOutlined  style={{ color: '#faad14', fontSize: 15 }} />
                : <MoonOutlined style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }} />}
              onClick={() => store.toggleDark()}
              style={{ padding: '2px 6px' }}
              title={store.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            />
          </div>

          {/* System status — hidden when collapsed */}
          {!collapsed && (
            <>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.35)',
                letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8,
              }}>
                System Status
              </div>

              {critCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <Dot h="critical" />
                  <span style={{ fontSize: 12, color: '#ff4d4f' }}>
                    {critCount} critical fault{critCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {warnCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <Dot h="warning" />
                  <span style={{ fontSize: 12, color: '#faad14' }}>
                    {warnCount} warning{warnCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {critCount === 0 && warnCount === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Dot h="ok" />
                  <span style={{ fontSize: 12, color: '#52c41a' }}>All systems normal</span>
                </div>
              )}

              <Tag style={{
                marginTop: 10, fontSize: 10, border: 'none',
                background: 'rgba(22,119,255,0.20)', color: '#69b1ff',
              }}>
                DEMO MODE
              </Tag>

              {/* Signed-in user + logout */}
              <div style={{
                marginTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: 10,
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginBottom: 6 }}>
                  Signed in as{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{user.displayName}</strong>
                </div>
                <Button
                  type="text"
                  size="small"
                  block
                  icon={<LogoutOutlined style={{ fontSize: 12 }} />}
                  onClick={onLogout}
                  style={{
                    color:     'rgba(255,255,255,0.40)',
                    fontSize:  11,
                    textAlign: 'left',
                    padding:   '2px 4px',
                  }}
                >
                  Sign out
                </Button>
              </div>
            </>
          )}

          {/* Logout icon when collapsed */}
          {collapsed && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                type="text" size="small"
                icon={<LogoutOutlined style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }} />}
                onClick={onLogout}
                title={`Sign out (${user.displayName})`}
                style={{ padding: '2px 6px' }}
              />
            </div>
          )}
        </div>
      </Sider>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <Layout
        style={{
          marginLeft: collapsed ? SIDER_COL : SIDER_W,
          transition: 'margin-left 0.2s',
          background: contentBg,
          minHeight: '100vh',
        }}
      >
        <Content>
          <Routes>
            <Route path="/"         element={<LandingPage />} />
            <Route path="/vrv"      element={<VRVPage />} />
            <Route path="/lighting" element={<LightingPage />} />
            <Route path="/btu"      element={<BTUPage />} />
            {user.role === 'admin' && (
              <Route path="/users" element={<UsersPage />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>

    </Layout>
  )
})

// ─── Root — manages auth + theme, both affect ConfigProvider ──────────────
const ThemedRoot = observer(() => {
  const store = useStore()
  const [user, setUser] = useState<AuthUser | null>(getStoredUser)

  function handleLogout() {
    clearAuth()
    setUser(null)
  }

  const themeConfig = {
    algorithm: store.darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#cf1322',
      borderRadius: 6,
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    },
  }

  return (
    <ConfigProvider theme={themeConfig}>
      {user
        ? (
          <AuthContext.Provider value={{ user, onLogout: handleLogout }}>
            <AppShell />
          </AuthContext.Provider>
        )
        : <LoginPage onLogin={setUser} />
      }
    </ConfigProvider>
  )
})

export default function App() {
  return (
    <BrowserRouter>
      <ThemedRoot />
    </BrowserRouter>
  )
}
