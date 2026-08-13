import { useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

const MENU_ID = 'dashboard-mobile-menu';

/*
 * Phone chrome: a compact bar, and a menu that drops down from it.
 *
 * The toggle sits at the right edge and turns into the close control in place,
 * so the tap that opens the menu and the tap that dismisses it land on the same
 * spot. Everything the sidebar and the summary strip used to occupy the screen
 * with is inside the panel, which overlays the section rather than pushing it
 * down.
 */
export default function MobileChrome({ open, onToggle, onClose, attention, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose, open]);

  return (
    <div className="mobile-chrome">
      <header className="mobile-bar">
        <div className="mobile-bar-brand">
          <div className="mobile-bar-name">AedesCapella</div>
          <div className="mobile-bar-sub">BARANGAY MOSQUITO WATCH</div>
        </div>

        <button
          type="button"
          className="mobile-bar-toggle"
          onClick={onToggle}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls={MENU_ID}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          {/* A device needing attention is the one thing worth surfacing before
              the menu is opened, so it rides on the button itself. */}
          {attention && !open ? <span className="mobile-bar-dot" aria-hidden="true" /> : null}
        </button>
      </header>

      {open && (
        <>
          <button
            type="button"
            className="mobile-menu-scrim"
            onClick={onClose}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div
            id={MENU_ID}
            ref={panelRef}
            className="mobile-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard menu"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
