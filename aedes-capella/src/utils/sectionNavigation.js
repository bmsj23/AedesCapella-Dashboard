/*
 * The one list of dashboard sections. The sidebar renders it, the number
 * shortcuts index into it, and the lazy-loading fallback reads its label, so a
 * section is named the same everywhere a reader can meet it.
 *
 * It was previously two lists: SECTION_IDS here and NAV_ITEMS in Sidebar.jsx.
 * Their order had to match for the number keys to open the item they sit next
 * to, and nothing enforced that.
 */
export const DASHBOARD_SECTIONS = [
  { id: 'feed', fig: '01', label: 'Latest Activity' },
  { id: 'map', fig: '02', label: 'Barangay Map' },
  { id: 'fog', fig: '03', label: 'Spraying History' },
  { id: 'nodes', fig: '04', label: 'Device Status' },
  { id: 'trends', fig: '05', label: 'Activity Summary' },
];

export const SECTION_IDS = DASHBOARD_SECTIONS.map(section => section.id);

const SECTION_SET = new Set(SECTION_IDS);

/**
 * The section's name as the sidebar shows it. Falls back to a neutral word
 * rather than an id, so a bad value never puts "nodes" in front of a reader.
 */
export function sectionLabel(id) {
  return DASHBOARD_SECTIONS.find(section => section.id === id)?.label || 'section';
}
const STORAGE_KEY = 'aedescapella:selected-section:v1';

export function isDashboardSection(value) {
  return SECTION_SET.has(value);
}

export function initialDashboardSection(windowObject = window) {
  const hashSection = windowObject.location.hash.replace(/^#/, '');
  if (isDashboardSection(hashSection)) return hashSection;

  try {
    const storedSection = windowObject.localStorage.getItem(STORAGE_KEY);
    if (isDashboardSection(storedSection)) return storedSection;
  } catch {
    // Persistence is optional when storage is blocked by browser settings.
  }
  return 'feed';
}

export function persistDashboardSection(section, windowObject = window) {
  if (!isDashboardSection(section)) return;
  try {
    windowObject.localStorage.setItem(STORAGE_KEY, section);
  } catch {
    // The URL hash still preserves the section when storage is unavailable.
  }
  windowObject.history.replaceState(null, '', `#${section}`);
}

export function sectionFromKeyboardEvent(event) {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;

  const target = event.target;
  const tagName = target?.tagName?.toLowerCase();
  if (target?.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select') return null;

  const index = Number(event.key) - 1;
  return Number.isInteger(index) ? SECTION_IDS[index] || null : null;
}
