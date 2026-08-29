import { useEffect, useState } from 'react';
import {
  Archive,
  Check,
  Copy,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import Banner from '../../components/ui/Banner';
import Card from '../../components/ui/Card';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import { C } from '../../constants/colors';
import {
  decommissionDevice,
  fetchLocations,
  registerDevice,
  rotateDeviceToken,
  updateDevice,
} from '../../lib/supabaseApi';
import { getFriendlyError } from '../../utils/userMessages';
import {
  deviceDraftToRpc,
  emptyDeviceDraft,
  generateDeviceToken,
  registryRowToDraft,
  sha256Hex,
  validateDeviceDraft,
} from '../../utils/deviceManagement';
import { formatDeviceName } from '../../utils/viewer';

function Field({ label, children, hint }) {
  return (
    <label className="device-field">
      <span className="device-field-label">{label}</span>
      {children}
      {hint ? <span className="device-field-hint">{hint}</span> : null}
    </label>
  );
}

function PlacementFields({ draft, onChange }) {
  return (
    <div className="device-placement-grid">
      <Field label="Distance from activity (m)">
        <input
          className="device-input"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={draft.placementDistanceM}
          onChange={event => onChange('placementDistanceM', event.target.value)}
        />
      </Field>
      <Field label="Microphone height (m)">
        <input
          className="device-input"
          type="number"
          min="0"
          max="10"
          step="0.1"
          value={draft.placementHeightM}
          onChange={event => onChange('placementHeightM', event.target.value)}
        />
      </Field>
      <Field label="Facing angle (degrees)">
        <input
          className="device-input"
          type="number"
          min="-180"
          max="180"
          step="1"
          value={draft.placementAngleDegrees}
          onChange={event => onChange('placementAngleDegrees', event.target.value)}
        />
      </Field>
    </div>
  );
}

function DeviceFormDialog({ device, locations, onClose, onSaved, accessToken }) {
  const editing = Boolean(device);
  const [draft, setDraft] = useState(() => editing
    ? registryRowToDraft(device)
    : emptyDeviceDraft(locations[0]?.location_id || ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issuedToken, setIssuedToken] = useState('');
  const [copied, setCopied] = useState(false);

  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));

  /*
   * Collapsed when there is nothing in it, open when there is. Editing a
   * sensor whose geometry we already recorded should not hide the numbers
   * behind a control the reader has to find, and adding a new one should not
   * open a panel that is empty.
   *
   * Read once from the initial draft rather than tracked: this decides where
   * the panel starts, and re-deriving it on every keystroke would slam the
   * panel shut the moment somebody cleared a field they were editing.
   */
  const [hasAdvancedValues] = useState(() => Boolean(
    draft.placementDistanceM || draft.placementHeightM
    || draft.placementAngleDegrees || draft.placementNotes || draft.firmwareVersion,
  ));

  async function submit(event) {
    event.preventDefault();
    const token = editing ? '' : generateDeviceToken();
    const nextDraft = editing ? draft : { ...draft, ingestToken: token };
    const validationError = validateDeviceDraft(nextDraft, { requireToken: !editing });
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (editing) {
        await updateDevice(
          accessToken,
          deviceDraftToRpc(nextDraft, { deviceId: device.device_id }),
        );
        await onSaved();
        onClose();
      } else {
        await registerDevice(
          accessToken,
          deviceDraftToRpc(nextDraft, { includeToken: true }),
        );
        setIssuedToken(token);
        await onSaved();
      }
    } catch (reason) {
      setError(getFriendlyError(reason, 'The device could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(issuedToken);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="device-dialog-scrim" role="presentation">
      <div className="device-dialog" role="dialog" aria-modal="true" aria-labelledby="device-form-title">
        <div className="device-dialog-head">
          <div>
            <h3 id="device-form-title">{editing ? 'Edit sensor' : issuedToken ? 'Sensor registered' : 'Add a sensor'}</h3>
          </div>
          <button className="device-icon-button" type="button" onClick={onClose} aria-label="Close device form">
            <X size={18} />
          </button>
        </div>

        {issuedToken ? (
          <div>
            <Banner
              icon={ShieldCheck}
              color="amber"
              text="Copy this key now. Only a scrambled copy is stored, so it cannot be shown again."
            />
            <div className="device-token-box">
              <code>{issuedToken}</code>
              <button className="device-secondary-button" type="button" onClick={copyToken}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy key'}
              </button>
            </div>
            <button className="device-primary-button" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error ? <Banner icon={ShieldCheck} color="red" text={error} /> : null}
            {/*
              * Two fields, and a sensor exists.
              *
              * This form used to ask for eight things at once: three of them
              * needed a tape measure and a protractor, one needed a build hash
              * the person standing at the pole does not have, and the person
              * who wrote the form described himself as overwhelmed by it. None
              * of the four is needed to create a working sensor.
              *
              * So they are still here, still saved, and still filled in for our
              * own registrations. They are just not in the way of somebody
              * installing a unit in a barangay. Every one of them accepts null
              * both here and in register_device, so a field install is never
              * blocked by a missing tape measure and the numbers can be added
              * from this same form afterwards.
              */}
            <div className="device-form-grid">
              <Field label="Sensor name" hint="Lowercase letters, numbers, and hyphens. For example, unit-2.">
                <input
                  className="device-input"
                  value={draft.deviceLabel}
                  onChange={event => change('deviceLabel', event.target.value)}
                  placeholder="unit-2"
                  autoComplete="off"
                  required
                />
              </Field>
              <Field label="Location">
                <select
                  className="device-input"
                  value={draft.locationId}
                  onChange={event => change('locationId', event.target.value)}
                  required
                >
                  <option value="">Choose a location</option>
                  {locations.map(location => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.location_name}, {location.barangay_name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {!editing ? (
              <p className="device-dialog-copy">
                That is everything needed. The sensor&apos;s key for sending data
                is created for you when you save, and shown once on the next
                screen.
              </p>
            ) : null}

            <details className="device-advanced" open={hasAdvancedValues}>
              <summary>
                Placement and firmware details
                <span>For the research team. Can be left blank and filled in later.</span>
              </summary>
              <div className="device-advanced-body">
                <PlacementFields draft={draft} onChange={change} />
                <Field label="Placement notes">
                  <textarea
                    className="device-input device-textarea"
                    value={draft.placementNotes}
                    onChange={event => change('placementNotes', event.target.value)}
                    maxLength={500}
                    placeholder="Direction, obstruction, shade, and reference point"
                  />
                </Field>
                <Field label="Firmware version" hint="The verified build identity, once it has been read back off the unit.">
                  <input
                    className="device-input"
                    value={draft.firmwareVersion}
                    onChange={event => change('firmwareVersion', event.target.value)}
                    placeholder="Leave blank until verified"
                    maxLength={120}
                  />
                </Field>
              </div>
            </details>

            <div className="device-dialog-actions">
              <button className="device-secondary-button" type="button" onClick={onClose}>Cancel</button>
              <button className="device-primary-button" type="submit" disabled={busy || !locations.length}>
                {busy ? 'Saving...' : editing ? 'Save changes' : 'Add sensor and create its key'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CredentialDialog({ device, accessToken, onClose, onSaved }) {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function rotate() {
    const nextToken = generateDeviceToken();
    setBusy(true);
    setError('');
    try {
      await rotateDeviceToken(accessToken, device.device_label, await sha256Hex(nextToken));
      setToken(nextToken);
      await onSaved();
    } catch (reason) {
      setError(getFriendlyError(reason, 'The sensor key could not be replaced.'));
    } finally {
      setBusy(false);
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="device-dialog-scrim" role="presentation">
      <div className="device-dialog" role="dialog" aria-modal="true" aria-labelledby="credential-title">
        <div className="device-dialog-head">
          <div>
            <h3 id="credential-title">Key for {formatDeviceName(device.device_label)}</h3>
          </div>
          <button className="device-icon-button" type="button" onClick={onClose} aria-label="Close sensor key dialog">
            <X size={18} />
          </button>
        </div>
        {error ? <Banner icon={ShieldCheck} color="red" text={error} /> : null}
        {token ? (
          <>
            <Banner
              icon={ShieldCheck}
              color="amber"
              text="Copy this now, it is shown only once. This sensor stays offline until you load this key into it and restart it."
            />
            <div className="device-token-box">
              <code>{token}</code>
              <button className="device-secondary-button" type="button" onClick={copyToken}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy key'}
              </button>
            </div>
          </>
        ) : (
          <>
            <Banner
              icon={ShieldCheck}
              color="amber"
              text="This sensor will stop sending data the moment you replace its key, and stays offline until the new key is loaded into it."
            />
            <p className="device-dialog-copy">
              The key is the sensor&apos;s password for sending data. It is built into the device, as{' '}
              <code>AEDES_DEVICE_TOKEN</code> in its <code>aedes_secrets.h</code>, so replacing it
              here means reflashing the sensor before it can send again. Replace the key only if it
              may have leaked and you can reflash this unit. The new key is shown once and cannot be
              retrieved later.
            </p>
          </>
        )}
        <div className="device-dialog-actions">
          <button className="device-secondary-button" type="button" onClick={onClose}>{token ? 'Done' : 'Cancel'}</button>
          {!token ? (
            <button className="device-primary-button" type="button" onClick={rotate} disabled={busy}>
              {busy ? 'Replacing...' : 'Replace key'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DecommissionDialog({ device, accessToken, onClose, onSaved }) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await decommissionDevice(accessToken, device.device_id, confirmation);
      await onSaved();
      onClose();
    } catch (reason) {
      setError(getFriendlyError(reason, 'The device could not be decommissioned.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="device-dialog-scrim" role="presentation">
      <div className="device-dialog" role="dialog" aria-modal="true" aria-labelledby="decommission-title">
        <div className="device-dialog-head">
          <div>
            <h3 id="decommission-title">Retire {formatDeviceName(device.device_label)}</h3>
          </div>
          <button className="device-icon-button" type="button" onClick={onClose} aria-label="Close retire sensor dialog">
            <X size={18} />
          </button>
        </div>
        <p className="device-dialog-copy">
          Everything this sensor recorded stays in the records. Its key stops working and it no longer counts as a sensor in the field.
        </p>
        {error ? <Banner icon={ShieldCheck} color="red" text={error} /> : null}
        <form onSubmit={submit}>
          <Field label={`Type ${device.device_label} to confirm`}>
            <input
              className="device-input"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <div className="device-dialog-actions">
            <button className="device-secondary-button" type="button" onClick={onClose}>Cancel</button>
            <button
              className="device-danger-button"
              type="submit"
              disabled={busy || confirmation !== device.device_label}
            >
              {busy ? 'Retiring...' : 'Retire sensor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DeviceManager({
  accessToken,
  role,
  registry = [],
  registryError = '',
  onRefresh,
}) {
  const technical = role === 'technical_personnel' || role === 'admin';
  const admin = role === 'admin';
  const [locations, setLocations] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    if (!technical || !accessToken) return undefined;
    const controller = new AbortController();
    fetchLocations(accessToken, controller.signal)
      .then(setLocations)
      .catch(reason => {
        if (reason?.name !== 'AbortError') {
          setLocationError(getFriendlyError(reason, 'The list of locations could not be loaded.'));
        }
      });
    return () => controller.abort();
  }, [accessToken, technical]);

  if (!technical) return null;

  const activeDevices = registry.filter(device => device.device_status !== 'decommissioned');

  return (
    <Card className="device-registry" style={{ marginTop: '24px', background: C.surface2 }}>
      <div className="device-registry-head">
        <div>
          <h3>Sensors</h3>
          <p>Add a sensor, change its name or location, or retire one. Every sensor here keeps its own key for sending data.</p>
        </div>
        {technical ? (
          <button className="device-primary-button" type="button" onClick={() => setDialog({ type: 'form' })}>
            <Plus size={16} /> Add a sensor
          </button>
        ) : null}
      </div>

      {registryError ? <Banner icon={ShieldCheck} color="red" text={registryError} /> : null}
      {locationError ? <Banner icon={ShieldCheck} color="red" text={locationError} /> : null}

      <div className="device-registry-list">
        {activeDevices.map(device => (
          <div className="device-registry-row" key={device.device_id}>
            <div className="device-registry-identity">
              <strong>{formatDeviceName(device.device_label)}</strong>
              <Mono size="11px" color={C.textDim}>{device.device_label}</Mono>
            </div>
            <div>
              <span className="device-registry-label">Location</span>
              <span>{device.location_name}, {device.barangay_name}</span>
            </div>
            <div>
              <span className="device-registry-label">Placement</span>
              <span>
                {device.placement_distance_m ?? 'Not set'} m / {device.placement_height_m ?? 'Not set'} m / {device.placement_angle_degrees ?? 'Not set'} deg
              </span>
            </div>
            <div>
              <span className="device-registry-label">Key for sending data</span>
              <Tag color={device.ingest_token_active ? 'green' : 'amber'}>
                {device.ingest_token_active ? 'Active' : 'Needs a key'}
              </Tag>
            </div>
            <div className="device-registry-actions">
              <button className="device-icon-button" type="button" onClick={() => setDialog({ type: 'form', device })} aria-label={`Edit ${device.device_label}`}>
                <Pencil size={16} />
              </button>
              {admin ? (
                <>
                  <button className="device-icon-button" type="button" onClick={() => setDialog({ type: 'token', device })} aria-label={`Replace the key for ${device.device_label}`}>
                    <KeyRound size={16} />
                  </button>
                  <button className="device-icon-button device-icon-danger" type="button" onClick={() => setDialog({ type: 'decommission', device })} aria-label={`Retire ${device.device_label}`}>
                    <Archive size={16} />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
        {!registryError && activeDevices.length === 0 ? (
          <div className="device-registry-empty">No sensors have been added yet.</div>
        ) : null}
      </div>

      {dialog?.type === 'form' ? (
        <DeviceFormDialog
          device={dialog.device}
          locations={locations}
          accessToken={accessToken}
          onClose={() => setDialog(null)}
          onSaved={onRefresh}
        />
      ) : null}
      {dialog?.type === 'token' ? (
        <CredentialDialog
          device={dialog.device}
          accessToken={accessToken}
          onClose={() => setDialog(null)}
          onSaved={onRefresh}
        />
      ) : null}
      {dialog?.type === 'decommission' ? (
        <DecommissionDialog
          device={dialog.device}
          accessToken={accessToken}
          onClose={() => setDialog(null)}
          onSaved={onRefresh}
        />
      ) : null}
    </Card>
  );
}
