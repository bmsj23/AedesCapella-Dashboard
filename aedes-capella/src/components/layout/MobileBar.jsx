import { Menu } from 'lucide-react';

/*
 * The phone-width chrome. Everything the sidebar and the summary strip used to
 * occupy the screen with now lives one tap away, so the section content starts
 * roughly 56px down the page instead of two thirds of the way down it.
 */
export default function MobileBar({ onOpenNav, navOpen, attention }) {
  return (
    <header className="mobile-bar">
      <button
        type="button"
        className="mobile-bar-toggle"
        onClick={onOpenNav}
        aria-label="Open menu"
        aria-expanded={navOpen}
        aria-controls="dashboard-nav-drawer"
      >
        <Menu size={22} aria-hidden="true" />
        {/* A device needing attention is the one thing worth surfacing before
            the drawer is opened, so it rides on the button itself. */}
        {attention ? <span className="mobile-bar-dot" aria-hidden="true" /> : null}
      </button>

      <div className="mobile-bar-brand">
        <div className="mobile-bar-name">AedesCapella</div>
        <div className="mobile-bar-sub">BARANGAY MOSQUITO WATCH</div>
      </div>
    </header>
  );
}
