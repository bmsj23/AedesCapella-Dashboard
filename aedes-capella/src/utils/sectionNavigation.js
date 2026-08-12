export const SECTION_IDS = ['feed', 'map', 'fog', 'nodes', 'trends'];

const SECTION_SET = new Set(SECTION_IDS);
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
