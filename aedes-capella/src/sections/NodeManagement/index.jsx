import { AlertTriangle, RefreshCw } from 'lucide-react';
import SectionHeader from '../../components/ui/SectionHeader';
import Banner from '../../components/ui/Banner';
import EmptyState from '../../components/ui/EmptyState';
import DeviceStateGuide from './DeviceStateGuide';
import NodeCard from './NodeCard';
import DeviceManager from './DeviceManager';
import { useViewerRole } from '../../contexts/viewerRole';

/** Device Status */
export default function NodeManagement({ deviceStatus, dashboardData, accessToken }) {
  const role = useViewerRole();
  const { devices, error, loading, refreshing, refresh, refreshedAt } = deviceStatus;
  const loggingFaults = devices.filter(device => device.operational_state === 'logging_fault');

  return (
    <div>
      <SectionHeader
        title="Device Status"
        subtitle="See which devices are working and which ones need checking."
      />
      {loggingFaults.length > 0 && (
        <Banner
          icon={AlertTriangle}
          text={`${loggingFaults.length} device${loggingFaults.length === 1 ? '' : 's'} may not be saving records. The device is sending a signal, but some information may be missing.`}
          color="red"
        />
      )}

      {/* Managing the fleet comes before reading its status. Adding a device,
          renaming one, or retiring one is the reason an administrator opens
          this tab, and it used to sit below every status card and the legend,
          so it was the last thing on the page instead of the first. */}
      <DeviceManager
        accessToken={accessToken}
        role={role}
        registry={dashboardData?.deviceRegistry || []}
        registryError={dashboardData?.errors?.deviceRegistry || ''}
        onRefresh={refresh}
      />

      {/* This row belongs to the status cards below it, not to the Devices
          panel above. Before the panel moved up it sat under the section
          header with its own breathing room; now it needs the top margin or it
          reads as that panel's footer. */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginTop: '28px',
        marginBottom: '20px',
        fontFamily: 'var(--font-data)',
        fontSize: '12px',
      }}>
        <span style={{ color: 'var(--color-text-dim)' }}>
          {refreshedAt ? `Last checked ${refreshedAt.toLocaleTimeString('en-PH')}` : 'Waiting for device information'}
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

      {/* A failed refresh must not discard device cards that are already on
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
          title="Device Information Unavailable"
          message={error}
          action="Check your connection or ask the system administrator, then try again."
          icon={AlertTriangle}
          variant="critical"
        />
      ) : loading ? (
        <EmptyState title="Checking Device Status" message="Please wait while the latest device information loads." />
      ) : devices.length ? (
        <div className="node-status-grid">
          {devices.map(device => <NodeCard key={device.device_id} device={device} />)}
        </div>
      ) : (
        <EmptyState
          title="No Devices Found"
          message="No device information is available yet."
          action="Ask the system administrator to add a device. Missing information is not the same as working normally."
        />
      )}

      {/* The legend reads as a footnote to the devices above it, not as a
          preamble a reader has to scroll past to reach their own devices. */}
      <DeviceStateGuide devices={devices} />

    </div>
  );
}
