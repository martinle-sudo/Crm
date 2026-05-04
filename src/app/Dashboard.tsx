import { BentoCard } from '@/ui/Card';
import { Timeline } from '@/features/timeline/Timeline';
import { Heatmap } from '@/features/heatmap/Heatmap';
import { PaymentCalendar } from '@/features/calendar/PaymentCalendar';
import { ScenariosPanel } from '@/features/scenarios/ScenariosPanel';
import { Subscriptions } from '@/features/subscriptions/Subscriptions';
import { Upcoming } from '@/features/upcoming/Upcoming';
import { Alerts } from '@/features/alerts/Alerts';

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 md:gap-5 auto-rows-min">
      <BentoCard
        accent="violet"
        size="lg"
        className="md:col-span-2 xl:col-span-8"
      >
        <Timeline />
      </BentoCard>

      <BentoCard accent="coral" size="lg" className="xl:col-span-4">
        <Alerts />
      </BentoCard>

      <BentoCard accent="cyan" size="lg" className="xl:col-span-7">
        <Heatmap />
      </BentoCard>

      <BentoCard accent="mint" size="lg" className="xl:col-span-5">
        <Upcoming />
      </BentoCard>

      <BentoCard accent="violet" size="xl" className="xl:col-span-8">
        <PaymentCalendar />
      </BentoCard>

      <BentoCard accent="amber" size="lg" className="xl:col-span-4">
        <ScenariosPanel />
      </BentoCard>

      <BentoCard accent="coral" size="lg" className="md:col-span-2 xl:col-span-12">
        <Subscriptions />
      </BentoCard>
    </div>
  );
}
