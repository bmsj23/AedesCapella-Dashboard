import { C } from '../../constants/colors';
import { formatDeviceName } from '../../utils/viewer';
import { useIsTechnical } from '../../contexts/viewerRole';
import Card from '../../components/ui/Card';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import WifiSignal from '../../components/charts/WifiSignal';
import {
  describeDeviceState,
  describeUploadBacklog,
  formatDuration,
  formatTimestamp,
  getStatusPresentation,
} from '../../utils/deviceStatus';
import { getEventPresentation } from '../../utils/dashboardData';

function Metric({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <Mono size="12px" color={C.textDim}>{label}</Mono>
      </div>
      <div style={{ textAlign: 'right', minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function NodeCard({ device }) {
  const technical = useIsTechnical();
  const status = getStatusPresentation(device.operational_state);
  const isFault = device.operational_state === 'logging_fault';
  const isOffline = ['offline', 'never_seen'].includes(device.operational_state);
  const latestEvent = getEventPresentation(device.latest_event_kind);
  const backlog = describeUploadBacklog(device);
  /*
   * True once the sensor has stopped checking in but has reported at some
   * point, which is exactly when the stored readings below stop describing it.
   * A sensor that never reported has nothing frozen to disclaim.
   */
  const staleReadings = device.has_ever_reported && !device.is_online;

  return (
    <Card
      className={isFault ? 'pd-tone-critical' : device.needs_attention ? 'pd-tone-warning' : ''}
      style={{
        opacity: isOffline ? 0.82 : 1,
        background: C.surface,
        boxShadow: isFault ? `0 16px 34px ${C.red}18` : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text }}>
            {formatDeviceName(device.device_label) || 'Unnamed device'}
          </div>
        </div>
        <Tag color={status.color}>{status.label}</Tag>
      </div>

      <div style={{
        padding: '12px',
        borderRadius: '8px',
        border: `1px solid ${isFault ? C.red : C.border}`,
        background: isFault ? C.redDim : C.surface2,
        color: isFault ? C.red : C.textDim,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '12px',
        lineHeight: 1.5,
        marginBottom: '16px',
      }}>
        {describeDeviceState(device)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* The two readings that describe now rather than then: one is a
            timestamp, the other counts forward from it. Everything below the
            marker was measured at that moment and has not moved since, so
            these two are lifted out to sit together above it. */}
        <Metric label="Last Seen">
          <Mono size="12px" color={C.text}>{formatTimestamp(device.last_seen_at)}</Mono>
        </Metric>

        <Metric label="Last Check-In">
          <Mono size="12px" color={device.needs_attention ? C.amber : C.text}>
            {device.heartbeat_age_seconds === null ? 'Never checked in' : formatDuration(Number(device.heartbeat_age_seconds) * 1000)}
          </Mono>
        </Metric>

        {/*
          * A sensor that has stopped reporting keeps rendering the readings from
          * its last update: "Signal: Strong" and "Running For" for a unit that
          * lost power a quarter of an hour ago. Those are measurements of a
          * past moment printed in the present tense, which is the same claim
          * the status label itself was making before the thresholds were fixed.
          * Naming them costs one line and no layout change.
          */}
        {staleReadings && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginTop: '4px', paddingTop: '10px', borderTop: `1px dashed ${C.border}`,
          }}>
            <Mono size="10px" color={C.amber} style={{ letterSpacing: '0.08em' }}>
              MEASURED AT THAT CHECK-IN, NOT NOW
            </Mono>
          </div>
        )}

        <Metric label="Saving Records">
          <Tag color={device.log_healthy ? 'green' : device.has_ever_reported ? 'red' : 'gray'}>
            {device.has_ever_reported ? device.log_healthy ? 'Okay' : 'Problem' : 'No update yet'}
          </Tag>
        </Metric>

        <Metric label="Waiting To Send">
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Tag color={backlog.color}>{backlog.label}</Tag>
            {backlog.detail && <Mono size="11px" color={C.textDim}>{backlog.detail}</Mono>}
          </div>
        </Metric>

        <Metric label="Sprayer Safe">
          <Tag color={device.relay_safe_high ? 'green' : 'red'}>
            {device.relay_safe_high ? 'Safe-high reported' : 'Unsafe — check device'}
          </Tag>
        </Metric>

        <Metric label="Signal">
          {device.wifi_rssi_dbm === null ? <Mono size="12px" color={C.textDim}>Not available</Mono> : <WifiSignal dbm={device.wifi_rssi_dbm} />}
        </Metric>

        {/* "Running For" is the one label that asserts the present rather than
            reporting a number, so it is the only one whose wording changes. */}
        <Metric label={staleReadings ? 'Had Been Running For' : 'Running For'}>
          <Mono size="12px" color={C.text}>{formatDuration(device.uptime_ms)}</Mono>
        </Metric>

        {technical && <Metric label="C3 boot / ordinal">
          <Mono size="12px" color={C.text}>{device.c3_boot ?? '—'} / {device.last_ordinal ?? '—'}</Mono>
        </Metric>}

        {technical && <Metric label="Free Heap">
          <Mono size="12px" color={C.text}>
            {device.free_heap_bytes === null ? 'Not available' : `${Math.round(device.free_heap_bytes / 1024)} KiB`}
          </Mono>
        </Metric>}

        <div style={{ height: 1, background: C.border }} />

        <Metric label="Latest Uploaded Activity">
          <Mono size="12px" color={C.text}>{formatTimestamp(device.latest_upload_or_event_at)}</Mono>
        </Metric>

        <Metric label="Latest Activity">
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Mono size="12px" color={C.text}>{device.latest_event_kind ? latestEvent.label : 'No activity yet'}</Mono>
            {device.latest_event_time_quality && <Tag color="blue">{device.latest_event_time_quality === 'unresolved' ? 'Exact event time unavailable' : device.latest_event_time_quality === 'boot_anchor' ? 'Time reconstructed from startup' : 'Device time synchronized'}</Tag>}
          </div>
        </Metric>

        <div className="info-grid info-grid-two">
          <div style={{ padding: '10px', background: C.surface2, borderRadius: '7px', textAlign: 'center' }}>
            <Mono size="20px" color={C.text} style={{ display: 'block' }}>{device.candidates_last_7d ?? 0}</Mono>
            <Mono size="10px" color={C.textDim}>POSSIBLE MOSQUITOES · 7 DAYS</Mono>
          </div>
          <div style={{ padding: '10px', background: C.surface2, borderRadius: '7px', textAlign: 'center' }}>
            <Mono size="20px" color={C.text} style={{ display: 'block' }}>{device.mist_events_last_7d ?? 0}</Mono>
            <Mono size="10px" color={C.textDim}>SPRAYINGS · 7 DAYS</Mono>
          </div>
        </div>
      </div>

      {isFault ? (
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start', color: C.red }}>
          <Mono size="11px" color={C.red} style={{ lineHeight: 1.5 }}>
            A later healthy update is needed. The earlier problem remains in the records.
          </Mono>
        </div>
      ) : device.log_healthy ? (
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center', color: C.green }}>
          <Mono size="11px" color={C.green}>The latest update says records are being saved.</Mono>
        </div>
      ) : null}
    </Card>
  );
}
