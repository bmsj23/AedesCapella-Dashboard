import { AlertTriangle, Clock3, Power, WifiOff } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

/*
 * The two windows are read from the view, never written here. They are derived
 * from the firmware's upload period, so a legend that states its own numbers
 * goes stale the moment that period changes. It said 45 and 90 while the view
 * had moved to 6 and 10, which is the same drift on the reader's side of the
 * screen. The fallbacks only cover the first paint, before any row arrives.
 */
const staticStates = (staleMinutes, offlineMinutes) => [
  {
    title: 'Not connected yet',
    message: 'This sensor is listed, but has never sent an update.',
    action: 'Ask the system administrator to check the setup.',
    icon: Power,
    variant: 'startup',
  },
  {
    title: 'Check soon',
    message: `The last sensor update was more than ${staleMinutes} minutes ago.`,
    action: 'Check the sensor soon or wait for a fresh update.',
    icon: Clock3,
    variant: 'warning',
  },
  {
    title: 'Offline',
    message: `The last sensor update was more than ${offlineMinutes} minutes ago.`,
    action: 'Ask the field or system team to check it safely.',
    icon: WifiOff,
    variant: 'offline',
  },
  {
    title: 'Records may be missing',
    message: 'The sensor is sending a signal, but some records may not be saved.',
    action: 'Treat its information as incomplete until a later healthy update.',
    icon: AlertTriangle,
    variant: 'critical',
  },
];

export default function DeviceStateGuide({ devices = [] }) {
  const published = devices.find(device => device.stale_after_minutes != null);
  const states = staticStates(
    published?.stale_after_minutes ?? '—',
    published?.offline_after_minutes ?? '—',
  );

  return (
    <div className="info-grid info-grid-four" style={{ marginTop: '20px' }}>
      {states.map(state => (
        <EmptyState
          key={state.title}
          title={state.title}
          message={state.message}
          action={state.action}
          icon={state.icon}
          variant={state.variant}
        />
      ))}
    </div>
  );
}
