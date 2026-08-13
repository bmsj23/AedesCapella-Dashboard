import { Database } from 'lucide-react';
import SectionHeader from '../../components/ui/SectionHeader';
import Banner from '../../components/ui/Banner';
import MetricCards from './MetricCards';
import DetectionTrendChart from './DetectionTrendChart';
import DistributionCharts from './DistributionCharts';

/** Section 5 — Trends & Analytics */
export default function TrendsAnalytics({ dashboardData, deviceStatus }) {
  const events = dashboardData?.activity || [];
  const candidates = dashboardData?.candidates || [];
  const deviceLabels = (deviceStatus?.devices || []).reduce((lookup, device) => ({
    ...lookup,
    [device.device_id]: device.device_label,
  }), {});

  return (
    <div>
      <SectionHeader
        fig="SEC.05"
        title="Activity Summary"
        subtitle="Totals over time, in Philippine time."
      />
      {(dashboardData?.errors?.activity || dashboardData?.errors?.candidates) && (
        <Banner
          icon={Database}
          text="One or more analytics sources are unavailable. Values shown below may be incomplete; polling will retry in 30 seconds."
          color="red"
        />
      )}
      <MetricCards events={events} candidates={candidates} />
      <DetectionTrendChart candidates={candidates} />
      <DistributionCharts events={events} candidates={candidates} deviceLabels={deviceLabels} />
    </div>
  );
}
