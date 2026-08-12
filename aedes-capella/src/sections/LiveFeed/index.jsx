import SectionHeader from '../../components/ui/SectionHeader';
import Glossary from '../../components/ui/Glossary';
import PaletteGuide from '../../components/ui/PaletteGuide';
import FeedTable from './FeedTable';
import ActivitySummary from './ActivitySummary';
import { filterOperatorActivity } from '../../utils/dashboardData';

/** Section 1 - Latest sensor activity */
export default function LiveFeed({ dashboardData, deviceStatus }) {
  const events = filterOperatorActivity(dashboardData?.activity || []);
  const deviceLabels = (deviceStatus?.devices || []).reduce((lookup, device) => ({
    ...lookup,
    [device.device_id]: device.device_label,
  }), {});

  return (
    <div>
      <SectionHeader
        fig="SEC.01"
        title="Latest Activity"
        subtitle="What the devices recorded recently. A possible mosquito is a sound that matched, not a confirmed mosquito."
      />
      {!dashboardData?.loading && !dashboardData?.errors?.activity && (
        <ActivitySummary events={events} summary={dashboardData?.activitySummary} />
      )}
      <FeedTable
        events={events}
        deviceLabels={deviceLabels}
        loading={dashboardData?.loading}
        error={dashboardData?.errors?.activity}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <PaletteGuide />
        <Glossary />
      </div>
    </div>
  );
}
