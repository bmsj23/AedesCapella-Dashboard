import { AlertTriangle, Clock3, Power, WifiOff } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const STATES = [
  {
    title: 'Not connected yet',
    message: 'This sensor is listed, but has never sent an update.',
    action: 'Ask the system administrator to check the setup.',
    icon: Power,
    variant: 'startup',
  },
  {
    title: 'Check soon',
    message: 'The last sensor update was more than 45 minutes ago.',
    action: 'Check the sensor soon or wait for a fresh update.',
    icon: Clock3,
    variant: 'warning',
  },
  {
    title: 'Not reporting',
    message: 'The last sensor update was more than 90 minutes ago.',
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

export default function DeviceStateGuide() {
  return (
    <div className="info-grid info-grid-four" style={{ marginTop: '20px' }}>
      {STATES.map(state => (
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
