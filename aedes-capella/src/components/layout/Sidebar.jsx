import { LogOut, Settings } from 'lucide-react';
import { C } from '../../constants/colors';
import { getStatusPresentation } from '../../utils/deviceStatus';
import { formatDeviceName } from '../../utils/viewer';
import Mono from '../ui/Mono';

/* Figure numbers, not glyphs. They match the SEC.0x on each section header so
   the sidebar doubles as the plate index. */
const NAV_ITEMS = [
  { id: 'feed',   fig: '01', label: 'Latest Activity' },
  { id: 'map',    fig: '02', label: 'Barangay Map' },
  { id: 'fog',    fig: '03', label: 'Spraying History' },
  { id: 'nodes',  fig: '04', label: 'Device Status' },
  { id: 'trends', fig: '05', label: 'Activity Summary' },
];

export default function Sidebar({ activeSection, onNavigate, deviceStatus, onLogout }) {
  /*
   * Layout lives in the stylesheet rather than inline: below 900px this
   * element dissolves so its three blocks can be ordered against the summary
   * strip, and an inline display would outrank the rule that does it.
   */
  return (
    <aside className="dashboard-sidebar">

      {/* Wordmark. No glyph: the type carries the mark. Height is pinned to the
          topbar so the two chrome edges form one continuous line. */}
      <div className="sidebar-brand">
        <div style={{
          fontFamily:    'Outfit, sans-serif',
          fontWeight:    800,
          fontSize:      '19px',
          color:         C.text,
          letterSpacing: '-0.01em',
          lineHeight:    1,
          whiteSpace:    'nowrap',
        }}>
          AedesCapella
        </div>
        <div style={{
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '10px',
          color:         'var(--pd-accent-ink)',
          letterSpacing: '0.14em',
          marginTop:     '7px',
        }}>
          BARANGAY MOSQUITO WATCH
        </div>
      </div>

      {/* Navigation */}
      <nav className="dashboard-nav" style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ id, fig, label }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-keyshortcuts={String(Number(fig))}
              title={`Open ${label} (${Number(fig)})`}
              style={{
                width:        '100%',
                display:      'flex',
                alignItems:   'center',
                gap:          '10px',
                padding:      '10px 10px',
                borderRadius: 'var(--pd-radius-xs)',
                border:       'none',
                background:   active ? 'var(--pd-accent)' : 'transparent',
                color:        active ? '#ffffff' : C.textDim,
                cursor:       'pointer',
                textAlign:    'left',
                marginBottom: '2px',
                transition:   'all 0.15s',
              }}
            >
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize:   '13.5px',
                fontWeight: active ? 600 : 500,
                flex:       1,
              }}>
                {label}
              </span>
              <span style={{
                fontFamily:    'IBM Plex Mono, monospace',
                fontSize:      '10px',
                letterSpacing: '0.08em',
                color:         active ? 'rgba(255,255,255,0.72)' : C.gray,
              }}>
                {fig}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Node mini status */}
      <div className="sidebar-device-status" style={{ padding: '14px', borderTop: '1px dashed var(--pd-dash)' }}>
        <div style={{
          fontFamily:    'IBM Plex Mono, monospace',
          fontSize:      '12px',
          color:         C.textDim,
          letterSpacing: '0.1em',
          marginBottom:  '10px',
        }}>
          DEVICES
        </div>
        {deviceStatus.loading && (
          <Mono size="12px" color={C.textDim}>Checking devices…</Mono>
        )}
        {!deviceStatus.loading && deviceStatus.error && (
          <Mono size="12px" color={C.red}>Device information unavailable</Mono>
        )}
        {!deviceStatus.loading && !deviceStatus.error && !deviceStatus.devices.length && (
          <Mono size="12px" color={C.textDim}>No devices listed</Mono>
        )}
        {!deviceStatus.loading && !deviceStatus.error && deviceStatus.devices.map(device => {
          const presentation = getStatusPresentation(device.operational_state);
          const isHealthy = device.operational_state === 'online';

          return (
            <div key={device.device_id} style={{
              display:     'flex',
              alignItems:  'center',
              gap:         '8px',
              marginBottom:'7px',
            }}>
              <div style={{
                width:        '7px',
                height:       '7px',
                borderRadius: '50%',
                background:   isHealthy ? C.green : C.gray,
                boxShadow:    isHealthy ? `0 0 6px ${C.green}` : 'none',
                animation:    isHealthy ? 'pulse 2s infinite' : 'none',
              }} />
              <Mono size="12px" color={isHealthy ? C.text : C.textDim} style={{ flex: 1, fontWeight: 700 }}>
                {formatDeviceName(device.device_label)}
              </Mono>
              <Mono size="12px" color={presentation.color === 'red' ? C.red : C.textDim}>
                {presentation.label}
              </Mono>
            </div>
          );
        })}
      </div>

      <div className="sidebar-settings" style={{ padding: '14px', borderTop: '1px dashed var(--pd-dash)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '12px',
          color: C.textDim,
          letterSpacing: '0.1em',
          marginBottom: '10px',
        }}>
          <Settings size={12} color={C.textDim} />
          SETTINGS
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.textDim,
              borderRadius: '8px',
              padding: '9px 10px',
              cursor: 'pointer',
            }}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={14} color={C.textDim} />
            <Mono size="12px" color={C.textDim} style={{ fontWeight: 700 }}>
              Logout
            </Mono>
          </button>
        )}
      </div>
    </aside>
  );
}
