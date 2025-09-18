'use client';
import { useEffect, useState } from 'react';
import { listenApplications, listenStatusEvents } from '@/lib/firestore';
import type { ApplicationDoc, StatusEvent } from '@/lib/types';
import CountsMultiPeriod from '@/components/Charts/CountsMultiPeriod';
import StatusUpdatesTimeline from '@/components/Charts/StatusUpdatesTimeline';
import RejectionReasonsPie from '@/components/Charts/RejectionReasonsPie';
import FunnelByStatus from '@/components/Charts/FunnelByStatus';
import AppsPerWeek from '@/components/Charts/AppsPerWeek';
import { useUser } from '../lib/useUser';

export default function Dashboard() {
  const [apps,setApps]=useState<ApplicationDoc[]>([]);
  const [events,setEvents]=useState<StatusEvent[]>([]);
  const { uid, loading } = useUser();
  useEffect(()=>{ if(!uid) return; const u1=listenApplications(uid,setApps); const u2=listenStatusEvents(uid,setEvents); return ()=>{u1();u2();}; },[uid]);
  if(!uid) return <p className="text-slate-600">Please sign in to view your dashboard.</p>;
  if (loading) return <p className="text-slate-600">Loading…</p>;
  return <div className="grid gap-6">
    <CountsMultiPeriod apps={apps}/>
    <div className="grid md:grid-cols-2 gap-6"><FunnelByStatus apps={apps}/><AppsPerWeek apps={apps}/></div>
    <StatusUpdatesTimeline events={events}/>
    <RejectionReasonsPie apps={apps}/>
  </div>;
}
