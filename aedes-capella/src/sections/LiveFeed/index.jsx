import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import Banner from '../../components/ui/Banner';
import SectionHeader from '../../components/ui/SectionHeader';
import Glossary from '../../components/ui/Glossary';
import PaletteGuide from '../../components/ui/PaletteGuide';
import FeedTable from './FeedTable';
import ActivitySummary from './ActivitySummary';
import { filterOperatorActivity, manilaStartOfDay } from '../../utils/dashboardData';
import { ACTIVITY_FETCH_LIMIT } from '../../lib/supabaseApi';
import { formatDeviceName } from '../../utils/viewer';

/** Section 1 - Latest device activity */
export default function LiveFeed({ dashboardData, deviceStatus }) {
  /*
   * Today is the default, because the question this section answers is "what
   * happened today". A week is a different question and it is answered a
   * screen away, in Activity Summary, which already has the 7 and 30 day
   * views.
   */
  const [scope, setScope] = useState('today');
  const recent = filterOperatorActivity(dashboardData?.activity || []);
  const dayStart = manilaStartOfDay();
  const today = recent.filter(event => Date.parse(event.display_time) >= dayStart);
  const events = scope === 'today' ? today : recent;
  /*
   * The activity query is capped at 100 rows server-side. If every row that
   * came back is still inside today, then today has at least as many rows as
   * were fetched and the table below is showing a slice of the day rather than
   * the day. The counts above it come from the database and stay right either
   * way, so saying nothing here would leave a table quietly disagreeing with
   * the number over it.
   */
  const mayBeTruncated = scope === 'today'
    && recent.length >= ACTIVITY_FETCH_LIMIT
    && today.length === recent.length;
  const deviceLabels = (deviceStatus?.devices || []).reduce((lookup, device) => ({
    ...lookup,
    [device.device_id]: formatDeviceName(device.device_label),
  }), {});

  return (
    <div>
      <SectionHeader
        title="Latest Activity"
        subtitle="What the devices recorded today."
        action={dashboardData?.refresh && (
          <button
            type="button"
            className="status-refresh-button"
            onClick={() => dashboardData.refresh()}
            disabled={dashboardData.loading}
          >
            <RefreshCw size={13} /> {dashboardData.loading ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      />
      {!dashboardData?.loading && !dashboardData?.errors?.activity && (
        <ActivitySummary events={events} summary={dashboardData?.activitySummary} />
      )}

      {/* The counts above obey this control, because a filtered table under an
          unfiltered total is how a dashboard gets misread. */}
      <div className="card-view-toggle" role="group" aria-label="Which period to show">
        <button
          type="button"
          className={scope === 'today' ? 'is-active' : ''}
          onClick={() => setScope('today')}
        >
          Today
        </button>
        <button
          type="button"
          className={scope === 'today' ? '' : 'is-active'}
          onClick={() => setScope('recent')}
        >
          Everything recent
        </button>
      </div>

      {mayBeTruncated && (
        <Banner
          icon={Info}
          color="amber"
          text="Today has more activity than fits in one list. The counts above are complete; the table below shows only the most recent."
        />
      )}

      <FeedTable
        events={events}
        deviceLabels={deviceLabels}
        loading={dashboardData?.loading}
        error={dashboardData?.errors?.activity}
        emptyToday={scope === 'today'}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <PaletteGuide />
        <Glossary />
      </div>
    </div>
  );
}
