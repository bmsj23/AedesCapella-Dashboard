import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/*
 * Slide-in panel holding the navigation and the live summary at phone widths.
 *
 * It is a modal surface: while it is open the page behind must not scroll, Esc
 * must close it, and focus must not be left behind on a button the reader can
 * no longer see. A health worker one-handed on a phone gets a scrim tap and a
 * close control as well as the keyboard route.
 */
const DRAWER_ID = 'dashboard-nav-drawer';

export default function NavDrawer({ open, onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const opener = document.activeElement;
    /*
     * A pointer tap does not always leave focus on the control that was
     * pressed, so activeElement can be the body. Fall back to whichever
     * control declares this drawer as its target, which is the menu button.
     */
    returnFocusRef.current = opener && opener !== document.body
      ? opener
      : document.querySelector(`[aria-controls="${DRAWER_ID}"]`);
    closeRef.current?.focus();

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      // Returning focus matters more than it looks: without it the next Tab
      // starts from the top of the document, not from the menu button.
      const target = returnFocusRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) target.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="nav-drawer-root">
      <button
        type="button"
        className="nav-drawer-scrim"
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={-1}
      />

      <div
        id={DRAWER_ID}
        ref={panelRef}
        className="nav-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard menu"
      >
        <div className="nav-drawer-head">
          <span className="nav-drawer-title">Menu</span>
          <button
            type="button"
            ref={closeRef}
            className="nav-drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="nav-drawer-body">{children}</div>
      </div>
    </div>
  );
}
