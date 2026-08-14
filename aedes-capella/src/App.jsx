import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { C } from './constants/colors';
import { useOperatorSession } from './hooks/useOperatorSession';
import { ViewerProvider } from './contexts/ViewerProvider';
import { useLiveDashboard } from './hooks/useLiveDashboard';
import { average, candidateScorePercent, countSince } from './utils/dashboardData';
import LoginPage from './components/auth/LoginPage';
import LogoutConfirmModal from './components/auth/LogoutConfirmModal';
import {
  initialDashboardSection,
  isDashboardSection,
  persistDashboardSection,
  sectionFromKeyboardEvent,
} from './utils/sectionNavigation';

// Layout
import Sidebar from './components/layout/Sidebar';
import Topbar  from './components/layout/Topbar';
import MobileChrome from './components/layout/MobileChrome';
import { useIsMobile } from './hooks/useIsMobile';

const LiveFeed = lazy(() => import('./sections/LiveFeed'));
const RiskMap = lazy(() => import('./sections/RiskMap'));
const FoggingLog = lazy(() => import('./sections/FoggingLog'));
const NodeManagement = lazy(() => import('./sections/NodeManagement'));
const TrendsAnalytics = lazy(() => import('./sections/TrendsAnalytics'));

const SECTIONS = {
  feed:   LiveFeed,
  map:    RiskMap,
  fog:    FoggingLog,
  nodes:  NodeManagement,
  trends: TrendsAnalytics,
};

export default function App() {
  const [activeSection, setActiveSection] = useState(() => initialDashboardSection());
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const { session, role, login, logout } = useOperatorSession();
  const liveData = useLiveDashboard(session?.accessToken);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const navigateToSection = useCallback(section => {
    if (!isDashboardSection(section)) return;
    setActiveSection(section);
    persistDashboardSection(section);
    // Choosing a section is the drawer's whole purpose; leaving it open would
    // hide the thing the reader just asked for.
    setNavOpen(false);
  }, []);

  /*
   * Widening the window past the breakpoint unmounts the drawer but would
   * leave navOpen set, so it would spring open again on the way back down.
   * Reset during render rather than in an effect: this is the state-adjustment
   * case React documents, and an effect here costs an extra render.
   */
  const [wasMobile, setWasMobile] = useState(isMobile);
  if (wasMobile !== isMobile) {
    setWasMobile(isMobile);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!session) return undefined;

    const handleHashChange = () => {
      const section = window.location.hash.replace(/^#/, '');
      if (isDashboardSection(section)) {
        setActiveSection(section);
        persistDashboardSection(section);
      }
    };
    const handleKeyDown = event => {
      const section = sectionFromKeyboardEvent(event);
      if (!section) return;
      event.preventDefault();
      navigateToSection(section);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateToSection, session]);
  const deviceStatus = {
    devices: liveData.devices,
    error: liveData.errors.devices || '',
    loading: liveData.loading,
    refreshing: liveData.refreshing,
    refreshedAt: liveData.reconciledAt,
    refresh: liveData.refresh,
  };

  const metricsAsOf = Math.max(
    liveData.reconciledAt?.getTime() || 0,
    Date.parse(liveData.activity[0]?.received_at || '') || 0,
  );
  const since24h = metricsAsOf - (24 * 60 * 60 * 1000);
  const candidatesToday = liveData.activitySummary
    ? Number(liveData.activitySummary.candidates_in_window || 0)
    : countSince(liveData.candidates, 'display_time', since24h);
  const relaysToday = liveData.activitySummary
    ? Number(liveData.activitySummary.relay_activations_in_window || 0)
    : countSince(
      liveData.relays.filter(relay => relay.recorded_relay_activation),
      'started_at',
      since24h,
    );
  const onlineNodes = deviceStatus.devices.filter(device => device.operational_state === 'online').length;
  const attentionNodes = deviceStatus.devices.filter(device => device.needs_attention).length;
  const avgCandidateScore = average(liveData.candidates.map(candidateScorePercent));

  // Render the active section component
  const ActiveSection = SECTIONS[activeSection];

  const topbarMetrics = {
    candidates: candidatesToday,
    relays: relaysToday,
    onlineNodes,
    totalNodes: deviceStatus.devices.length,
    avgCandidateScore,
    attentionNodes,
    loading: liveData.loading,
    candidateUnavailable: Boolean(liveData.errors.candidates),
    relayUnavailable: Boolean(liveData.errors.relays),
    deviceUnavailable: Boolean(liveData.errors.devices),
  };

  const summary = (
    <Topbar
      metrics={topbarMetrics}
      connectionState={liveData.connectionState}
      reconciledAt={liveData.reconciledAt}
    />
  );

  const navigation = (
    <Sidebar
      activeSection={activeSection}
      onNavigate={navigateToSection}
      deviceStatus={deviceStatus}
      /*
       * The menu deliberately stays open behind the confirmation. Closing it
       * here meant cancelling dropped the reader back on the dashboard,
       * undoing a navigation they never asked for.
       */
      onLogout={() => setShowLogoutModal(true)}
    />
  );

  if (!session) {
    return (
      <LoginPage onLogin={login} />
    );
  }

  return (
    <ViewerProvider role={role}>
    <div className="app-shell" style={{
      background: C.bg,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {!isMobile && navigation}

      <div className="app-main">
        {isMobile ? (
          <MobileChrome
            open={navOpen}
            onToggle={() => setNavOpen(open => !open)}
            onClose={closeNav}
            attention={attentionNodes > 0}
          >
            {/* Navigation first: choosing a section is why the menu gets
                opened. The live summary reads as a footer under it. */}
            {navigation}
            {summary}
          </MobileChrome>
        ) : summary}

        <main className="section-scroll">
          <Suspense fallback={<div style={{ color: C.textDim }}>Loading dashboard section…</div>}>
            <ActiveSection
              deviceStatus={deviceStatus}
              dashboardData={liveData}
            />
          </Suspense>
        </main>
      </div>

      {showLogoutModal && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            logout();
          }}
        />
      )}
    </div>
    </ViewerProvider>
  );
}
