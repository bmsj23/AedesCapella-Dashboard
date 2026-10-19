import { Database, Zap } from 'lucide-react';
import Card from '../../components/ui/Card';
import SectionHeader from '../../components/ui/SectionHeader';
import Banner from '../../components/ui/Banner';
import FogSummaryCards from './FogSummaryCards';
import HourlyFogChart from './HourlyFogChart';
import FogTable from './FogTable';
import { buildHourlyRelaySeries } from '../../utils/dashboardData';

export default function FoggingLog({ dashboardData }) {
  const relays = dashboardData?.relays || [];

  return (
    <div>
      <SectionHeader
        title="Spraying History"
        subtitle="When the sprayers were asked to run, when they ran, and when a request was refused."
      />
      {/* <Banner
        icon={Zap}
        text="These are the sprayer records saved by each device. They do not prove by themselves that spray actually came out."
        color="amber"
      />
      <Banner
        icon={Database}
        text={dashboardData?.reconciledAt
          ? `Last checked: ${dashboardData.reconciledAt.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.`
          : 'Waiting for the first update.'}
        color="blue"
      /> */}
      {!dashboardData?.loading && !dashboardData?.errors?.relays && (
        <>
          <FogSummaryCards relays={relays} />
          <HourlyFogChart data={buildHourlyRelaySeries(relays)} />
        </>
      )}
      <Card style={{ marginBottom: '16px' }}>
        <strong>How automatic spraying works</strong>
        <p>A sound check is also called a bag. The configured rule asks for 3 of the last 5 checks to match Aedes, then a 5 second sprayer pulse and a 120 second wait before another spray.</p>
        <p>This describes the configured rule. Each row below shows the evidence that was saved. Switching on the output does not prove that liquid was delivered.</p>
      </Card>
      <FogTable
        relays={relays}
        loading={dashboardData?.loading}
        error={dashboardData?.errors?.relays}
      />
    </div>
  );
}
