import { useState } from 'react';
import { C } from '../../constants/colors';
import { DETECTION_TERM_UPPER } from '../../constants/terminology';
import { formatDeviceName } from '../../utils/viewer';
import { useIsTechnical } from '../../contexts/viewerRole';
import Card from '../../components/ui/Card';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import WifiSignal from '../../components/charts/WifiSignal';
import {
  describeDeviceState,
  describeUploadBacklog,
  describeDetector,
  formatDuration,
  formatTimestamp,
  getStatusPresentation,
} from '../../utils/deviceStatus';
import { getEventPresentation } from '../../utils/dashboardData';

/*
 * A cell holds a badge or a sentence, never both on one line.
 *
 * These rows rendered the chip and its explanation side by side, so the eye
 * could not tell whether it was reading a label or a sentence and the row read
 * as broken layout. The badge carries the state. Anything further is secondary
 * and sits beneath it, dim and small, where it is clearly a footnote to the
 * chip rather than a second thing competing with it.
 */
function BadgeWithNote({ color, label, note }) {
  return (
    <div className="node-metric-stack">
      <Tag color={color}>{label}</Tag>
      {note ? (
        <Mono size="11px" color={C.textDim} style={{ lineHeight: 1.45 }}>{note}</Mono>
      ) : null}
    </div>
  );
}

function Metric({ label, children }) {
  return (
    <div className="node-metric" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
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
  /*
   * Only the two qualified cases produce a line. 'ntp' is the normal, correct
   * case and says nothing a reader can act on, so it says nothing.
   */
  const timeQualityNote = device.latest_event_time_quality === 'unresolved'
    ? 'The exact time this happened is not known.'
    : device.latest_event_time_quality === 'boot_anchor'
      ? 'The time is worked out from when the sensor last started up.'
      : '';
  const backlog = describeUploadBacklog(device);
  const detector = describeDetector(device);
  /*
   * True once the sensor has stopped checking in but has reported at some
   * point, which is exactly when its stored readings stop describing it. A
   * sensor that never reported has no snapshot to separate out, and one that
   * is checking in has a snapshot that is current, so neither gets the toggle.
   */
  const staleReadings = device.has_ever_reported && !device.is_online;
  const [showLastOnline, setShowLastOnline] = useState(false);
  /*
   * Current status is the default and always wins on first paint: an operator
   * opening the section is asking what is true now, and must not have to
   * notice a control to get an honest answer. The stored snapshot is shown
   * only when it is still current, or when it is explicitly asked for.
   */
  const showSnapshot = !staleReadings || showLastOnline;

  /*
   * The line that closes the card. Every card renders one so that every card's
   * closing block is the same height; the empty case is a blank that holds its
   * line and hides.
   */
  const closingNote = isFault
    ? {
      text: 'A later healthy update is needed. The earlier problem remains in the records.',
      color: C.red,
      visible: true,
    }
    : device.log_healthy
      ? {
        text: 'The latest update says records are being saved.',
        color: C.green,
        visible: showSnapshot,
      }
      : { text: ' ', color: C.textDim, visible: false };

  /*
   * The heartbeat snapshot: everything the sensor measured about itself at one
   * moment. Held in a variable because it is rendered in two different places
   * depending on whether the card has a toggle, and duplicating the block is
   * how the two would drift apart.
   */
  const snapshotMetrics = (
    <>
      <Metric label="Saving Records">
        <Tag color={device.log_healthy ? 'green' : device.has_ever_reported ? 'red' : 'gray'}>
          {device.has_ever_reported ? device.log_healthy ? 'Okay' : 'Problem' : 'No update yet'}
        </Tag>
      </Metric>

      <Metric label="Waiting To Send">
        <BadgeWithNote color={backlog.color} label={backlog.label} note={backlog.detail} />
      </Metric>

      <Metric label="Detector">
        <BadgeWithNote color={detector.color} label={detector.label} note={detector.detail} />
      </Metric>

      {/* "Safe-high reported" named the GPIO level the firmware holds the relay
          pin at. It is true, and it tells a barangay worker nothing. The two
          readings a reader can act on are: the sprayer is off and safe, or it
          is not and somebody should look. */}
      <Metric label="Sprayer">
        <Tag color={device.relay_safe_high ? 'green' : 'red'}>
          {device.relay_safe_high ? 'Off and safe' : 'Not safe, check the device'}
        </Tag>
      </Metric>

      <Metric label="Signal">
        {device.wifi_rssi_dbm === null ? <Mono size="12px" color={C.textDim}>Not available</Mono> : <WifiSignal dbm={device.wifi_rssi_dbm} />}
      </Metric>

      <Metric label="Running For">
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
    </>
  );

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
        fontFamily: 'var(--font-data)',
        fontSize: '12px',
        lineHeight: 1.5,
        marginBottom: '16px',
      }}>
        {describeDeviceState(device)}
      </div>

      {/*
        * The card carries two kinds of reading and they are only the same thing
        * while the sensor is checking in.
        *
        * Server-side facts stay true whatever the sensor is doing: when it was
        * last heard from, what has arrived, how much has arrived this week.
        * The heartbeat snapshot is different. Signal, uptime, storage and the
        * relay state were measured at one moment and frozen, so on a unit that
        * lost power they describe the past in the present tense.
        *
        * Labelling the frozen block in place was tried first and read as noise.
        * Splitting the card is what the layout could not hold without this
        * control (plan 3.1): the two groups need different tenses on screen at
        * the same time, and no ordering of one list does that.
        *
        * While the sensor is online both groups are current, so there is no
        * toggle and nothing changes from what the operator already knows.
        */}
      {staleReadings && (
        <div className="card-view-toggle" role="group" aria-label="Which readings to show">
          <button
            type="button"
            className={showLastOnline ? '' : 'is-active'}
            onClick={() => setShowLastOnline(false)}
          >
            Current status
          </button>
          <button
            type="button"
            className={showLastOnline ? 'is-active' : ''}
            onClick={() => setShowLastOnline(true)}
          >
            Last online status
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Metric label="Last Seen">
          <Mono size="12px" color={C.text}>{formatTimestamp(device.last_seen_at)}</Mono>
        </Metric>

        <Metric label="Last Check-In">
          <Mono size="12px" color={device.needs_attention ? C.amber : C.text}>
            {device.heartbeat_age_seconds === null ? 'Never checked in' : formatDuration(Number(device.heartbeat_age_seconds) * 1000)}
          </Mono>
        </Metric>

        {/*
          * The two views share one grid cell, so the cell is always as tall as
          * the taller of them and the card does not resize when the toggle is
          * pressed. The hidden view keeps its space but is taken out of the
          * accessibility tree by visibility:hidden rather than being unmounted.
          *
          * A sensor with no toggle renders the snapshot directly: there is only
          * one view, so there is nothing to reserve space against.
          */}
        {staleReadings ? (
          <div className="node-card-views">
            <div className={showLastOnline ? undefined : 'is-hidden'}>
              <Mono size="11px" color={C.textDim} style={{ lineHeight: 1.5 }}>
                Below is what the sensor reported when it last checked in. It is
                not what the sensor is doing now.
              </Mono>
              {snapshotMetrics}
            </div>
            <div className={showLastOnline ? 'is-hidden' : undefined}>
              <Mono size="11px" color={C.textDim} style={{ lineHeight: 1.5 }}>
                Signal, storage and sprayer readings come from the sensor, so
                there are none while it is silent. Everything below arrived
                before it went quiet and is still correct.
              </Mono>
            </div>
          </div>
        ) : snapshotMetrics}
      </div>

      {/* Pinned to the bottom of the plate by .node-card-close, so this block
          lands on the same baseline on every card in the row however many rows
          the view above it is showing.

          Server-side, so these hold whatever the sensor is doing: they say what
          reached the dashboard, not what the sensor is up to. */}
      <div className="node-card-close">
        <div style={{ height: 1, background: C.border }} />

        <Metric label="Latest Uploaded Activity">
          <Mono size="12px" color={C.text}>{formatTimestamp(device.latest_upload_or_event_at)}</Mono>
        </Metric>

        <Metric label="Latest Activity">
          <Mono size="12px" color={C.text}>{device.latest_event_kind ? latestEvent.label : 'No activity yet'}</Mono>
        </Metric>

        {/*
          * The sentence carries this row, so the badge goes.
          *
          * "Ready again [DEVICE TIME SYNCHRONIZED]" put a chip next to an
          * ordinary sentence, and the chip was the half that could not be
          * acted on: a synchronised clock is the normal case, and a reader who
          * cannot do anything differently on reading it is only being asked to
          * decode a badge. So the good case now says nothing at all, and the
          * two cases that qualify the timestamp say so in a plain line.
          *
          * Rendered even when empty, for the same reason as the closing note
          * below: a card that omits the line has a shorter closing block and
          * lifts its totals off the baseline its neighbour sits on.
          */}
        <div className={timeQualityNote ? undefined : 'is-hidden'}>
          <Mono size="11px" color={C.textDim} style={{ lineHeight: 1.45 }}>
            {timeQualityNote || ' '}
          </Mono>
        </div>

        <div className="info-grid info-grid-two">
          <div style={{ padding: '10px', background: C.surface2, borderRadius: '7px', textAlign: 'center' }}>
            <Mono size="20px" color={C.text} style={{ display: 'block' }}>{device.candidates_last_7d ?? 0}</Mono>
            <Mono size="10px" color={C.textDim}>{DETECTION_TERM_UPPER.plural} · 7 DAYS</Mono>
          </div>
          <div style={{ padding: '10px', background: C.surface2, borderRadius: '7px', textAlign: 'center' }}>
            <Mono size="20px" color={C.text} style={{ display: 'block' }}>{device.mist_events_last_7d ?? 0}</Mono>
            <Mono size="10px" color={C.textDim}>SPRAYINGS · 7 DAYS</Mono>
          </div>
        </div>

        {/*
          * Always rendered, even when there is nothing to say. A card that
          * simply omits this line has a shorter closing block, which lifts its
          * divider and totals off the baseline its neighbour sits on; that is
          * what left Device 1 and Device 2 unaligned. The empty case holds one
          * line of space and hides.
          *
          * The healthy line reads off log_healthy, part of the heartbeat
          * snapshot, so it hides with the snapshot too: a silent sensor
          * reassuring the operator that records are being saved is the same
          * stale claim in a friendlier voice.
          */}
        <div
          className={closingNote.visible ? undefined : 'is-hidden'}
          style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}
        >
          <Mono size="11px" color={closingNote.color} style={{ lineHeight: 1.5 }}>
            {closingNote.text}
          </Mono>
        </div>
      </div>
    </Card>
  );
}
