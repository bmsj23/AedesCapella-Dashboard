import { AlertTriangle, RefreshCw } from 'lucide-react';
import SectionHeader from '../../components/ui/SectionHeader';
import Banner from '../../components/ui/Banner';
import EmptyState from '../../components/ui/EmptyState';
import DeviceStateGuide from './DeviceStateGuide';
import NodeCard from './NodeCard';

/** Section 4 - Node Management */
export default function NodeManagement({ deviceStatus }) {
  const { devices, error, loading, refreshing, refresh, refreshedAt } = deviceStatus;
  const loggingFaults = devices.filter(device => device.operational_state === 'logging_fault');

  return (
    <div>
      <SectionHeader
        fig="SEC.04"
        title="Device Status"
        subtitle="Which devices are working and which ones need checking."
      />
      {loggingFaults.length > 0 && (
        <Banner
          icon={AlertTriangle}
          text={`${loggingFaults.length} sensor${loggingFaults.length === 1 ? '' : 's'} may not be saving records. The sensor is sending a signal, but some information may be missing.`}
          color="red"
        />
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '12px',
      }}>
        <span style={{ color: 'var(--color-text-dim)' }}>
          {refreshedAt ? `Last checked ${refreshedAt.toLocaleTimeString('en-PH')}` : 'Waiting for sensor information'}
        </span>
        <button
          className="status-refresh-button"
          onClick={() => refresh()}
          disabled={loading || refreshing}
        >
          <RefreshCw size={13} className={refreshing ? 'is-spinning' : undefined} />
          {' '}{loading || refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* A failed refresh must not discard sensor cards that are already on
          screen. The reducer keeps the previous rows, so the failure is
          reported above them and the reader keeps the last known state, dated
          by "Last checked" above. Only a failure with nothing to fall back on
          takes over the section. */}
      {error && devices.length > 0 && (
        <Banner
          icon={AlertTriangle}
          text={`${error} Showing the last information received.`}
          color="amber"
        />
      )}

      {error && devices.length === 0 ? (
        <EmptyState
          title="Sensor Information Unavailable"
          message={error}
          action="Check your connection or ask the system administrator, then try again."
          icon={AlertTriangle}
          variant="critical"
        />
      ) : loading ? (
        <EmptyState title="Checking Sensor Status" message="Please wait while the latest sensor information loads." />
      ) : devices.length ? (
        <div className="node-status-grid">
          {devices.map(device => <NodeCard key={device.device_id} device={device} />)}
        </div>
      ) : (
        <EmptyState
          title="No Sensors Found"
          message="No sensor information is available yet."
          action="Ask the system administrator to add a sensor. Missing information is not the same as working normally."
        />
      )}

      {/* The legend reads as a footnote to the devices above it, not as a
          preamble a reader has to scroll past to reach their own sensors. */}
      <DeviceStateGuide />
    </div>
  );
}
