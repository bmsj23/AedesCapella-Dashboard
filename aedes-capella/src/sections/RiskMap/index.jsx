import SectionHeader from '../../components/ui/SectionHeader';
import RealtimeDeviceMap from './RealtimeDeviceMap';
import LocationActivityPanel from './LocationActivityPanel';

export default function RiskMap({ dashboardData }) {
  const devices = dashboardData?.mapDevices || [];

  return (
    <div>
      <SectionHeader
        fig="SEC.02"
        title="Barangay Map"
        subtitle="Where each device is, and what it recorded recently."
      />
      {/* <Banner
        icon={Database}
        text="Only authorized location coordinates are plotted. Missing coordinates stay in the Location not mapped list and are never assigned a placeholder point."
        color="blue"
      /> */}
      <RealtimeDeviceMap
        devices={devices}
        candidates={dashboardData?.candidates || []}
        relays={dashboardData?.relays || []}
        loading={dashboardData?.loading}
        error={dashboardData?.errors?.mapDevices}
      />
      <LocationActivityPanel
        devices={devices}
        loading={dashboardData?.loading}
        error={dashboardData?.errors?.mapDevices}
      />
    </div>
  );
}
