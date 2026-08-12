const RELOAD_GUARD_KEY = 'aedescapella:preload-reload-at';
const RELOAD_GUARD_MS = 10_000;

export function installPreloadRecovery(windowObject = window, now = () => Date.now()) {
  const handlePreloadError = event => {
    event.preventDefault();

    let lastReloadAt = 0;
    try {
      lastReloadAt = Number(windowObject.sessionStorage.getItem(RELOAD_GUARD_KEY)) || 0;
    } catch {
      // A reload still helps when storage is blocked by browser privacy settings.
    }

    const currentTime = now();
    if (currentTime - lastReloadAt < RELOAD_GUARD_MS) return;

    try {
      windowObject.sessionStorage.setItem(RELOAD_GUARD_KEY, String(currentTime));
    } catch {
      // Storage is only used to avoid loops; it is not required for recovery.
    }
    windowObject.location.reload();
  };

  windowObject.addEventListener('vite:preloadError', handlePreloadError);
  return () => windowObject.removeEventListener('vite:preloadError', handlePreloadError);
}
