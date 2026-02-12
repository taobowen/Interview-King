// Dashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import { listenApplications, listenStatusEvents } from '@/lib/firestore';
import type { ApplicationDoc, StatusEvent } from '@/lib/types';
import CountsMultiPeriod from '@/components/Charts/CountsMultiPeriod';
import StatusUpdatesTimeline from '@/components/Charts/StatusUpdatesTimeline';
import FunnelByStatus from '@/components/Charts/FunnelByStatus';
import ApplicationSankey from '@/components/Charts/ApplicationSankey';
import KPIs from '@/components/KPI';
import { useUser } from '@/lib/useUser';

export default function Dashboard() {
  const [apps, setApps] = useState<ApplicationDoc[]>([]);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const { uid, loading } = useUser();

  useEffect(() => {
    if (!uid) return;
    const u1 = listenApplications(uid, setApps);
    const u2 = listenStatusEvents(uid, setEvents);
    return () => { u1(); u2(); };
  }, [uid]);

  if (loading) return <p className="text-slate-600">Loading…</p>;
  if (!uid)   return <p className="text-slate-600">Please sign in to view your dashboard.</p>;

  return (
    <div className="grid gap-6">
      <KPIs apps={apps} events={events} />
      <div className="grid md:grid-cols-2 gap-6">
        <ApplicationSankey apps={apps} events={events} title="Overall application progress (Sankey)" />
        <ApplicationSankey apps={apps} events={events} recentDays={30} title="Recent 30 days application progress (Sankey)" />
      </div>
      <CountsMultiPeriod apps={apps} />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Application Status Distribution</h3>
          <FunnelByStatus apps={apps} />
        </div>
        <StatusUpdatesTimeline events={events} />
      </div>
    </div>
  );
}
