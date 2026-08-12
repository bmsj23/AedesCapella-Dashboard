import { lazy, Suspense, useState } from 'react';
import { C } from './constants/colors';
import { useOperatorSession } from './hooks/useOperatorSession';
import { ViewerProvider } from './contexts/ViewerProvider';
import { useLiveDashboard } from './hooks/useLiveDashboard';
import { average, candidateScorePercent, countSince } from './utils/dashboardData';
import LoginPage from './components/auth/LoginPage';
import LogoutConfirmModal from './components/auth/LogoutConfirmModal';

// Layout
import Sidebar from './components/layout/Sidebar';
import Topbar  from './components/layout/Topbar';

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
  const [activeSection, setActiveSection] = useState('feed');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { session, role, login, logout } = useOperatorSession();
  const liveData = useLiveDashboard(session?.accessToken);
  const deviceStatus = {
    devices: liveData.devices,
    error: liveData.errors.devices || '',
    loading: liveData.loading,
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
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        deviceStatus={deviceStatus}
        onLogout={() => setShowLogoutModal(true)}
      />

      <div className="app-main">
        <Topbar
          metrics={{
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
          }}
          connectionState={liveData.connectionState}
          reconciledAt={liveData.reconciledAt}
        />

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
