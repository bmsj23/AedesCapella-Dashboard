import { useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import Banner from '../../components/ui/Banner';
import SectionHeader from '../../components/ui/SectionHeader';
import Glossary from '../../components/ui/Glossary';
import PaletteGuide from '../../components/ui/PaletteGuide';
import NeedsAttention from './NeedsAttention';
import FeedTable from './FeedTable';
import ActivitySummary from './ActivitySummary';
import ActivityDatePicker from '../../components/ui/ActivityDatePicker';
import { useActivityRange } from '../../hooks/useActivityRange';
import { activityWindow, manilaDate } from '../../utils/activityWindow';
import { DEFAULT_DISPLAY_FROM, resolveDisplayCutoff } from '../../utils/displayCutoff';
import { filterOperatorActivity, manilaStartOfDay } from '../../utils/dashboardData';
import { ACTIVITY_FETCH_LIMIT } from '../../lib/supabaseApi';
import { formatDeviceName } from '../../utils/viewer';

/** Section 1 - Latest device activity */
export default function LiveFeed({ dashboardData, deviceStatus, accessToken }) {
  const [scope, setScope] = useState('today');
  const [date, setDate] = useState(() => manilaDate());
  const { cutoffMs } = resolveDisplayCutoff(
    dashboardData?.displaySettings,
    import.meta.env.VITE_DISPLAY_FROM || DEFAULT_DISPLAY_FROM,
  );
  const window = scope === 'today' ? null : activityWindow(scope, date, cutoffMs);
  const range = useActivityRange(accessToken, window?.startIso, window?.endIso);
  const bufferedActivity = dashboardData?.activity || [];
  const recent = filterOperatorActivity(bufferedActivity);
  const dayStart = manilaStartOfDay();
  const today = recent.filter(event => Date.parse(event.display_time) >= dayStart);
  // Defence in depth for settings changes and views running before the cutoff migration.
  const events = scope === 'today' ? today : filterOperatorActivity(range.rows).filter(event => {
    const time = Date.parse(event.display_time);
    return window && time >= Date.parse(window.startIso) && time < Date.parse(window.endIso);
  });
  const loading = scope === 'today' ? dashboardData?.loading : range.loading;
  const error = scope === 'today' ? dashboardData?.errors?.activity : range.error;
  const refresh = scope === 'today' ? dashboardData?.refresh : range.refresh;
  /*
   * The activity query is capped at 100 rows server-side. If every row that
   * came back is still inside today, then today has at least as many rows as
   * were fetched and the table below is showing a slice of the day rather than
   * the day. The counts above it come from the database and stay right either
   * way, so saying nothing here would leave a table quietly disagreeing with
   * the number over it.
   */
  const mayBeTruncated = scope === 'today'
    // Hidden cooldown rejections still consume slots in the fetched buffer.
    && bufferedActivity.length >= ACTIVITY_FETCH_LIMIT
    && bufferedActivity.every(event => Date.parse(event.display_time) >= dayStart);
  const deviceLabels = (deviceStatus?.devices || []).reduce((lookup, device) => ({
    ...lookup,
    [device.device_id]: formatDeviceName(device.device_label),
  }), {});

  return (
    <div>
      <SectionHeader
        title="Latest Activity"
        subtitle="What the devices recorded in the selected period."
        action={refresh && (scope === 'today' || window) && (
          <button
            type="button"
            className="status-refresh-button"
            onClick={() => refresh()}
            disabled={loading}
          >
            <RefreshCw size={13} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      />
      <NeedsAttention dashboardData={dashboardData} deviceStatus={deviceStatus} />
      {/* The counts obey this control, because a filtered table under an
          unfiltered total is how a dashboard gets misread. */}
      <ActivityDatePicker scope={scope} onScopeChange={setScope}
        date={date} onDateChange={setDate}
        min={Number.isFinite(cutoffMs) ? manilaDate(cutoffMs) : undefined}
        max={manilaDate()} window={window} />

      {!loading && !error && (scope === 'today' || window) && (
        <ActivitySummary events={events}
          summary={scope === 'today' ? dashboardData?.activitySummary : null}
          periodLabel={window?.label} incomplete={scope !== 'today' && range.capped} />
      )}

      {window?.cutoffApplied && (
        <Banner icon={Info} color="amber"
          text="This period begins before the display cutoff. Only records from the display cutoff onward are included." />
      )}
      {scope !== 'today' && range.capped && (
        <Banner icon={Info} color="amber"
          text="This period reached the 5,000 record limit. The table and counts include only the newest loaded records. Pick a day for a smaller period." />
      )}

      {mayBeTruncated && (
        <Banner
          icon={Info}
          color="amber"
          text="Today has more activity than fits in one list. The counts above are complete. The table below shows only the most recent."
        />
      )}

      {(scope === 'today' || window) && <FeedTable
        events={events}
        deviceLabels={deviceLabels}
        loading={loading}
        error={error}
        emptyToday={scope === 'today'}
        periodLabel={window?.label}
        emptyTitle={window?.emptyTitle}
        capped={scope !== 'today' && range.capped}
      />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <PaletteGuide />
        <Glossary />
      </div>
    </div>
  );
}
