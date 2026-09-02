import { C } from '../../constants/colors';
import Card from './Card';
import Mono from './Mono';

/*
 * The whole colour scale, and its only documentation.
 *
 * This legend once said colour meant severity while the activity feed used
 * colour for the kind of event, so a normal night of a detection followed by
 * the spray it triggered rendered as "check soon" then "needs action" and sent
 * a barangay worker to inspect a device that was working perfectly.
 *
 * The fix was not to ban the second meaning. It was to give it a different
 * shape. There are now two scales and they never share a colour:
 *
 *   filled pill     how urgent, and someone may have to act
 *   coloured text   what kind of thing happened, and nothing is being asked
 *
 * Both are listed below, because the failure mode here has always been a
 * meaning that exists on screen and not in this legend. If a tone is added to
 * Tag.jsx it is added here in the same change.
 */
const URGENCY = [
  { name: 'Green', meaning: 'Okay', use: 'The device is working, or the check finished.', color: C.green },
  { name: 'Amber', meaning: 'Check soon', use: 'Look at this when you can. Nothing is urgent.', color: C.amber },
  { name: 'Red', meaning: 'Needs action', use: 'Somebody has to do something about this.', color: C.red },
  { name: 'Slate', meaning: 'Recorded', use: 'Something happened and was written down. Nothing to do.', color: 'var(--tag-neutral-fill)' },
  { name: 'Gray', meaning: 'No information', use: 'The device is not reporting, or this is not known.', color: C.gray },
];

const KIND = [
  { name: 'Indigo', meaning: 'The device itself', use: 'The device started up.', color: 'var(--tag-indigo-fill)' },
  { name: 'Teal', meaning: 'Something heard', use: 'A sound matched, or the record has a confirmed time.', color: 'var(--tag-teal-fill)' },
  { name: 'Violet', meaning: 'The sprayer', use: 'Spray was requested, switched on, or switched off.', color: 'var(--tag-violet-fill)' },
  { name: 'Gray-blue', meaning: 'Bookkeeping', use: 'Waiting periods, test checks, and estimated times.', color: 'var(--tag-slate-fill)' },
];

function Swatches({ items, columns }) {
  return (
    <div className={`info-grid info-grid-${columns}`}>
      {items.map(item => (
        <div
          key={item.name}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '9px' }}>
            <span style={{
              width: '14px',
              height: '14px',
              borderRadius: '3px',
              background: item.color,
              flexShrink: 0,
            }} />
            <Mono size="14px" color={C.text} style={{ fontWeight: 700 }}>{item.name} - {item.meaning}</Mono>
          </div>
          <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>{item.use}</Mono>
        </div>
      ))}
    </div>
  );
}

const headingStyle = {
  fontFamily: 'Outfit, sans-serif',
  fontSize: '16px',
  fontWeight: 700,
  color: C.text,
  marginBottom: '14px',
};

const noteStyle = {
  display: 'block',
  marginBottom: '14px',
  lineHeight: 1.5,
  maxWidth: '68ch',
};

export default function PaletteGuide() {
  return (
    <Card style={{ background: C.surface2 }}>
      <div style={headingStyle}>What the Colors Mean</div>

      <Mono size="12px" color={C.textDim} style={noteStyle}>
        A colour inside a filled label says how urgent something is. Those are
        the only ones that ever ask you to do anything.
      </Mono>
      <Swatches items={URGENCY} columns="five" />

      <div style={{ ...headingStyle, marginTop: '22px' }}>Colours in Latest Activity</div>
      <Mono size="12px" color={C.textDim} style={noteStyle}>
        In Latest Activity the words themselves are coloured, with no filled
        label behind them. That colour only says what kind of thing happened. A
        device hearing a mosquito and the sprayer switching on are both normal,
        so neither one turns the screen red.
      </Mono>
      <Swatches items={KIND} columns="four" />
    </Card>
  );
}
